import { MongoClient, type Db, type Collection } from 'mongodb';
import type { WorkItem } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * MongoDB document type for WorkItems.
 * Uses Notion page ID as the _id field for natural deduplication.
 */
interface WorkItemDocument extends Omit<WorkItem, 'id'> {
  _id: string;
}

/**
 * MongoDB service for persistent WorkItem storage.
 * Provides connection management and CRUD operations for the items collection.
 */
class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private itemsCollection: Collection<WorkItemDocument> | null = null;
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  /**
   * Connect to MongoDB Atlas.
   * Creates indexes for optimal query performance.
   */
  async connect(uri: string): Promise<void> {
    try {
      this.client = new MongoClient(uri);
      await this.client.connect();

      this.db = this.client.db(this.dbName);
      this.itemsCollection = this.db.collection<WorkItemDocument>('items');

      // Create indexes for common query patterns
      await this.createIndexes();

      logger.store.info(`Connected to MongoDB database: ${this.dbName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.store.error(`Failed to connect to MongoDB: ${message}`);
      throw new Error(`MongoDB connection failed: ${message}`);
    }
  }

  /**
   * Create indexes for optimal query performance.
   */
  private async createIndexes(): Promise<void> {
    if (!this.itemsCollection) return;

    try {
      await this.itemsCollection.createIndex({ type: 1 });
      await this.itemsCollection.createIndex({ parentId: 1 });
      await this.itemsCollection.createIndex({ updatedAt: -1 });
      await this.itemsCollection.createIndex({ children: 1 });
      logger.store.debug('MongoDB indexes created');
    } catch {
      // Indexes may already exist, which is fine
      logger.store.debug('Index creation skipped (may already exist)');
    }
  }

  /**
   * Close the MongoDB connection.
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.itemsCollection = null;
      logger.store.info('MongoDB connection closed');
    }
  }

  /**
   * Check if connected to MongoDB.
   */
  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  /**
   * Get the items collection.
   * Throws if not connected.
   */
  private getCollection(): Collection<WorkItemDocument> {
    if (!this.itemsCollection) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.itemsCollection;
  }

  /**
   * Convert WorkItem to MongoDB document.
   */
  private toDocument(item: WorkItem): WorkItemDocument {
    const { id, ...rest } = item;
    return { _id: id, ...rest };
  }

  /**
   * Convert MongoDB document to WorkItem.
   */
  private fromDocument(doc: WorkItemDocument): WorkItem {
    const { _id, ...rest } = doc;
    return { id: _id, ...rest };
  }

  /**
   * Get all items from the database.
   */
  async getAllItems(): Promise<WorkItem[]> {
    const collection = this.getCollection();
    const docs = await collection.find({}).toArray();
    return docs.map(doc => this.fromDocument(doc));
  }

  /**
   * Get a single item by ID.
   */
  async getItem(id: string): Promise<WorkItem | null> {
    const collection = this.getCollection();
    const doc = await collection.findOne({ _id: id });
    return doc ? this.fromDocument(doc) : null;
  }

  /**
   * Check if an item exists.
   */
  async hasItem(id: string): Promise<boolean> {
    const collection = this.getCollection();
    const count = await collection.countDocuments({ _id: id }, { limit: 1 });
    return count > 0;
  }

  /**
   * Insert or update a single item.
   */
  async upsertItem(item: WorkItem): Promise<void> {
    const collection = this.getCollection();
    const doc = this.toDocument(item);
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
    logger.store.debug(`Upserted item to MongoDB: ${item.id}`);
  }

  /**
   * Bulk insert or update items.
   * Uses bulkWrite for optimal performance.
   */
  async upsertItems(items: WorkItem[]): Promise<void> {
    if (items.length === 0) return;

    const collection = this.getCollection();
    const operations = items.map(item => {
      const doc = this.toDocument(item);
      return {
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      };
    });

    const result = await collection.bulkWrite(operations);
    logger.store.info(
      `MongoDB bulk upsert: ${result.upsertedCount} inserted, ${result.modifiedCount} modified`
    );
  }

  /**
   * Delete an item by ID.
   * Returns true if the item was deleted.
   */
  async deleteItem(id: string): Promise<boolean> {
    const collection = this.getCollection();
    const result = await collection.deleteOne({ _id: id });
    const deleted = result.deletedCount > 0;
    if (deleted) {
      logger.store.debug(`Deleted item from MongoDB: ${id}`);
    }
    return deleted;
  }

  /**
   * Get the total count of items.
   */
  async getItemCount(): Promise<number> {
    const collection = this.getCollection();
    return await collection.countDocuments();
  }

  /**
   * Get items updated since a given timestamp.
   * Useful for incremental sync validation.
   */
  async getItemsUpdatedSince(since: Date): Promise<WorkItem[]> {
    const collection = this.getCollection();
    const docs = await collection
      .find({
        updatedAt: { $gte: since.toISOString() },
      })
      .toArray();
    return docs.map(doc => this.fromDocument(doc));
  }

  /**
   * Replace all items in the database.
   * Used for full sync - clears existing data and inserts new items.
   */
  async replaceAllItems(items: WorkItem[]): Promise<void> {
    const collection = this.getCollection();

    // Use a transaction-like approach: drop all and insert
    await collection.deleteMany({});

    if (items.length > 0) {
      const docs = items.map(item => this.toDocument(item));
      await collection.insertMany(docs);
    }

    logger.store.info(`MongoDB: Replaced all items (${items.length} total)`);
  }

  /**
   * Update parent-child relationships for an item.
   * Called when an item is added/updated to maintain bidirectional relationships.
   */
  async updateRelationships(item: WorkItem, oldParentId?: string): Promise<void> {
    const collection = this.getCollection();

    // Remove from old parent's children if parent changed
    if (oldParentId && oldParentId !== item.parentId) {
      await collection.updateOne({ _id: oldParentId }, { $pull: { children: item.id } });
    }

    // Add to new parent's children
    if (item.parentId) {
      await collection.updateOne({ _id: item.parentId }, { $addToSet: { children: item.id } });
    }
  }

  /**
   * Orphan children when a parent is deleted.
   * Sets parentId to undefined for all children of the deleted item.
   */
  async orphanChildren(parentId: string): Promise<void> {
    const collection = this.getCollection();
    await collection.updateMany({ parentId: parentId }, { $unset: { parentId: '' } });
    logger.store.debug(`Orphaned children of deleted item: ${parentId}`);
  }

  /**
   * Get database statistics.
   */
  async getStats(): Promise<{
    totalItems: number;
    itemsByType: Record<string, number>;
  }> {
    const collection = this.getCollection();

    const totalItems = await collection.countDocuments();

    // Aggregate by type
    const typeCounts = await collection
      .aggregate<{ _id: string; count: number }>([{ $group: { _id: '$type', count: { $sum: 1 } } }])
      .toArray();

    const itemsByType: Record<string, number> = {};
    for (const { _id, count } of typeCounts) {
      itemsByType[_id] = count;
    }

    return { totalItems, itemsByType };
  }
}

// Singleton instance
let mongoInstance: MongoDBService | null = null;

/**
 * Initialize the MongoDB service.
 * Must be called before using getMongoDB().
 */
export async function initializeMongoDB(uri: string, dbName: string): Promise<MongoDBService> {
  mongoInstance = new MongoDBService(dbName);
  await mongoInstance.connect(uri);
  return mongoInstance;
}

/**
 * Get the MongoDB service instance.
 * Throws if not initialized.
 */
export function getMongoDB(): MongoDBService {
  if (!mongoInstance || !mongoInstance.isConnected()) {
    throw new Error('MongoDB not initialized. Call initializeMongoDB first.');
  }
  return mongoInstance;
}

/**
 * Close the MongoDB connection.
 */
export async function closeMongoDB(): Promise<void> {
  if (mongoInstance) {
    await mongoInstance.close();
    mongoInstance = null;
  }
}

export { MongoDBService };
