# CLI Tool Implementation Plan

## Overview

This document outlines the plan to create a command-line interface (CLI) tool for administrative operations, replacing HTTP endpoints for backend processes like sync operations. The CLI approach provides better security, auditability, and operational control for production environments.

## Rationale

Current HTTP endpoints (`/api/sync`) expose administrative operations without authentication, creating security risks in production. A CLI tool offers:

- **Security**: No exposed HTTP endpoints for admin operations
- **Auditability**: Built-in logging and execution tracking
- **Scripting**: Easy integration with cron, CI/CD, deployment scripts
- **Developer Experience**: Clear, documented commands with help text
- **Production Safety**: Explicit execution context, no accidental triggers

## Architecture

### Technology Stack

- **commander**: Argument parsing and command routing
- **chalk**: Colored terminal output
- **ora**: Loading spinners for long operations
- **cli-progress**: Progress bars for sync operations

### Project Structure

```
server/
  src/
    cli/
      index.ts           # CLI entry point
      commands/
        sync.ts          # Sync commands (full, incremental, item)
        database.ts      # Database maintenance commands
        health.ts        # Health check commands
      utils/
        output.ts        # Formatting utilities
        config.ts        # CLI-specific configuration
```

### Entry Point

Add to `server/package.json`:

```json
{
  "bin": {
    "notion-sync": "./dist/cli/index.js"
  },
  "scripts": {
    "cli": "tsx src/cli/index.ts",
    "build:cli": "tsc && chmod +x dist/cli/index.js"
  }
}
```

## Commands

### 1. Sync Commands

#### Full Sync
```bash
npm run cli sync full
notion-sync sync full
```

- Fetches all data from all Notion databases
- Rebuilds entire cache
- Shows progress bar with item count
- Displays summary of changes

#### Incremental Sync
```bash
npm run cli sync incremental
notion-sync sync incremental
```

- Fetches only items updated since last sync
- Updates cache selectively
- Faster execution for regular updates

#### Single Item Sync
```bash
npm run cli sync item <id>
notion-sync sync item 269c2345-ab46-81ff-9d48-fb89b2ceebf4
```

- Syncs specific item by ID
- Preserves type from existing data
- Useful for debugging or targeted updates

#### Options
- `--dry-run`: Preview changes without applying
- `--verbose`: Detailed logging
- `--format json|text`: Output format
- `--timeout <seconds>`: Custom timeout (default: 300)

### 2. Database Commands

#### List Configurations
```bash
npm run cli database list
```

- Shows all configured Notion databases
- Displays IDs, types, data source IDs
- Status information

#### Test Connection
```bash
npm run cli database test [type]
notion-sync database test deliverable
```

- Validates API credentials
- Tests database accessibility
- Verifies data source discovery

#### Clear Cache
```bash
npm run cli database clear [type]
```

- Clears in-memory cache
- Optional: clear specific type only
- Preserves MongoDB data

### 3. Health Commands

#### System Status
```bash
npm run cli health
```

- MongoDB connection status
- Cache statistics (item counts, memory usage)
- Last sync timestamps
- Notion API connectivity

#### Diagnostics
```bash
npm run cli health diagnose
```

- Runs comprehensive health checks
- Validates environment configuration
- Tests all integrations
- Generates diagnostic report

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Install dependencies (commander, chalk, ora, cli-progress)
- [ ] Create CLI directory structure
- [ ] Set up entry point with basic command routing
- [ ] Implement help text and version command
- [ ] Add npm scripts for development

**Deliverables**: Basic CLI skeleton that responds to `--help` and `--version`

### Phase 2: Sync Commands (Week 2)
- [ ] Implement full sync command
- [ ] Implement incremental sync command
- [ ] Implement single item sync command
- [ ] Add progress indicators and spinners
- [ ] Add dry-run mode
- [ ] Implement output formatters (JSON, text)
- [ ] Error handling and user-friendly messages

**Deliverables**: Functional sync commands matching current HTTP endpoint capabilities

### Phase 3: Database & Health Commands (Week 3)
- [ ] Implement database list command
- [ ] Implement database test command
- [ ] Implement cache clear command
- [ ] Implement health check command
- [ ] Implement diagnostics command
- [ ] Add verbose logging option
- [ ] Create comprehensive help documentation

**Deliverables**: Complete CLI tool with all planned commands

### Phase 4: Migration & Deprecation (Week 4)
- [ ] Add deprecation warnings to HTTP endpoints
- [ ] Update deployment documentation
- [ ] Create migration guide for existing scripts
- [ ] Add CLI to Docker containers (if applicable)
- [ ] Update cron jobs to use CLI
- [ ] Add admin key authentication to HTTP endpoints (temporary)
- [ ] Plan HTTP endpoint removal timeline

**Deliverables**: Migration path for production systems

## Usage Examples

### Development
```bash
# Run sync during development
npm run cli sync full --verbose

# Test specific database
npm run cli database test project

# Check system health
npm run cli health
```

### Production (via cron)
```bash
# Daily incremental sync (5 AM)
0 5 * * * cd /opt/notion-tree && /usr/bin/node dist/cli/index.js sync incremental >> logs/sync.log 2>&1

# Weekly full sync (Sunday 2 AM)
0 2 * * 0 cd /opt/notion-tree && /usr/bin/node dist/cli/index.js sync full >> logs/sync-full.log 2>&1
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Sync Notion Data
  run: |
    npm run cli sync full --format json > sync-result.json
    cat sync-result.json
```

### Docker
```dockerfile
# Add to Dockerfile
COPY dist/cli /app/cli
RUN chmod +x /app/cli/index.js && ln -s /app/cli/index.js /usr/local/bin/notion-sync

# Usage in container
docker exec notion-server notion-sync sync full
```

## Migration Strategy

### Phase 1: Parallel Operation (Month 1)
- CLI implemented and tested
- HTTP endpoints remain functional
- Add deprecation warnings to HTTP responses
- Update internal tools to use CLI

### Phase 2: Transition (Month 2)
- Update all deployment scripts to use CLI
- Migrate cron jobs to CLI commands
- Add admin key authentication to HTTP endpoints
- Monitor for external HTTP endpoint usage

### Phase 3: Deprecation (Month 3)
- Remove HTTP sync endpoints
- Keep read-only endpoints
- Update API documentation
- Final migration support for users

## Security Considerations

### CLI Security
- No network exposure (local execution only)
- Inherits server's file system permissions
- Environment variables for sensitive config
- Audit logging for all operations

### HTTP Endpoint Transition
- Add API key authentication before removal
- Rate limiting on remaining endpoints
- Monitor for unauthorized access attempts
- Clear deprecation timeline in documentation

## Testing Strategy

### Unit Tests
- Command parsing and validation
- Output formatting
- Error handling
- Dry-run mode verification

### Integration Tests
- Full sync operation
- Incremental sync operation
- Database connectivity
- MongoDB interaction
- Notion API calls

### End-to-End Tests
- Complete workflows
- Cron integration
- Docker container execution
- Error recovery scenarios

## Timeline Estimate

- **Week 1**: Foundation - Basic CLI structure
- **Week 2**: Core sync commands
- **Week 3**: Additional commands (database, health)
- **Week 4**: Migration preparation and documentation
- **Total**: ~3-4 weeks for complete implementation and migration

## Dependencies

### New Packages
```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.0",
    "cli-progress": "^3.12.0"
  }
}
```

### Existing Services (Reused)
- `syncService`: Core sync logic
- `dataStore`: Cache operations
- `notion`: Notion API client
- `mongodb`: Database operations
- `logger`: Logging infrastructure

## Success Criteria

- [ ] All HTTP sync functionality replicated in CLI
- [ ] Comprehensive help documentation
- [ ] Progress indicators for long operations
- [ ] JSON output mode for scripting
- [ ] Zero breaking changes during migration
- [ ] Production deployment successful
- [ ] HTTP endpoints removed (final milestone)

## Future Enhancements

### Potential Features
- Interactive mode for guided operations
- Configuration wizard for initial setup
- Export/import commands for data portability
- Webhook testing tools
- Performance profiling commands
- Data validation and repair tools

### Advanced Operations
- Batch operations (sync multiple items)
- Scheduled operations (built-in cron)
- Rollback capabilities
- Data diff and comparison tools
- Migration between Notion workspaces

## Notes

- CLI tool should work both in development (via npm run) and production (global install)
- Maintain backward compatibility with existing sync logic
- Consider Windows compatibility (tested on PowerShell)
- Document all commands with examples
- Provide clear error messages for common failures
- Consider internationalization for future

## References

- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Chalk Documentation](https://github.com/chalk/chalk)
- [Ora Documentation](https://github.com/sindresorhus/ora)
- [CLI Progress Documentation](https://github.com/npkgz/cli-progress)
