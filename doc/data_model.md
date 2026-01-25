# Data Models

## Overview
This document describes the data models used in the notion-project, including data synchronized from Notion to MongoDB and API-related models.

## MongoDB Models

### Notion Page Model
```javascript
{
    _id: ObjectId,
    notionId: String,        // Notion page ID
    title: String,
    content: Object,         // Page content blocks
    properties: Object,      // Page properties
    createdTime: Date,
    lastEditedTime: Date,
    syncedAt: Date          // Last sync timestamp
}
```

### Notion Database Model
```javascript
{
    _id: ObjectId,
    notionId: String,        // Notion database ID
    title: String,
    schema: Object,          // Database schema/properties
    records: Array,          // Database entries
    createdTime: Date,
    lastEditedTime: Date,
    syncedAt: Date
}
```

### Entity Relationships

The data model follows a hierarchical structure with **Problem** as the first-class entity. All other entities are attached to a Problem:

```
Problem (First-class entity)
├── Solution (many-to-one with Problem)
├── Project (many-to-one with Problem)
├── Task (many-to-one with Problem)
└── Deliverable (many-to-one with Problem)
```

Each of these entities (Solution, Project, Task, Deliverable) contains a reference to their parent Problem:

```javascript
{
    // Common reference field in Solution, Project, Task, Deliverable
    problemId: String,  // Reference to parent Problem's notionId
    // ... other entity-specific fields
}
```
