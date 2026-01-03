# Contributing to Notion Opportunity Tree Visualizer

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your Notion API credentials
4. Start the development server:
   ```bash
   npm run dev         # Frontend only
   npm run dev:full    # Frontend + backend
   ```

## Code Style

### TypeScript

- Use strict TypeScript with all compiler checks enabled
- Prefer explicit types for function parameters and return values
- Use type imports: `import type { Type } from './module'`
- Avoid `any` - use `unknown` and type guards when type is uncertain

### React

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract complex logic into custom hooks (`src/hooks/`)
- Use the Zustand store for global state (`src/store/useStore.ts`)

### File Organization

```
src/
  components/     # React components by category
    canvas/       # Canvas view components
    common/       # Shared components
    filters/      # Filter-related components
    tree/         # Tree view components
    ui/           # Base UI components
    views/        # Main view components
  hooks/          # Custom React hooks
  services/       # API and external service clients
  store/          # Zustand state management
  types/          # TypeScript type definitions
  utils/          # Utility functions
```

### Naming Conventions

- **Files**: PascalCase for components (`TreeNode.tsx`), camelCase for utilities (`dateUtils.ts`)
- **Components**: PascalCase (`TreeNode`, `FilterPanel`)
- **Functions/Variables**: camelCase (`calculateLayout`, `itemCount`)
- **Types/Interfaces**: PascalCase (`WorkItem`, `NotionConfig`)
- **Constants**: SCREAMING_SNAKE_CASE in `constants.ts` (`VIEW_LIMITS`)

## Available Scripts

```bash
# Development
npm run dev           # Start Vite dev server
npm run dev:server    # Start backend API server
npm run dev:full      # Start both frontend and backend

# Quality
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
npm run typecheck     # Run TypeScript type checking
npm run format        # Format code with Prettier
npm run format:check  # Check formatting

# Testing
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:ui       # Run tests with UI

# Building
npm run build         # Build frontend for production
npm run build:all     # Build frontend and backend
```

## Testing Guidelines

### Writing Tests

- Place test files next to the code they test: `utils/dateUtils.ts` -> `utils/dateUtils.test.ts`
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies (API calls, localStorage, etc.)

### Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionToTest } from './module';

describe('functionToTest', () => {
  it('should return expected result for valid input', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(functionToTest('')).toBe('default');
  });
});
```

## Commit Guidelines

### Commit Message Format

Use conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(canvas): add zoom controls to canvas view
fix(notion): handle rate limiting errors gracefully
docs: update README with new configuration options
refactor(store): simplify filter logic
```

### Pre-commit Hooks

The project uses Husky and lint-staged to run checks before commits:

- ESLint with auto-fix
- Prettier formatting
- TypeScript type checking

If a commit fails, fix the issues and try again.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the guidelines above
3. Ensure all tests pass: `npm run test:run`
4. Ensure linting passes: `npm run lint`
5. Ensure build succeeds: `npm run build`
6. Create a pull request with a clear description

### PR Description Template

```markdown
## Summary

Brief description of the changes.

## Changes

- List of specific changes made

## Testing

- How the changes were tested
- Any new tests added

## Screenshots (if applicable)

Include screenshots for UI changes.
```

## Architecture Notes

### State Management

- Global state is managed with Zustand (`src/store/useStore.ts`)
- The store includes selectors for computed values (`getFilteredItems`, `getTreeNodes`)
- Prefer derived state over duplicated state

### Data Flow

```
Notion API -> notionService -> Zustand Store -> React Components
                   |
              Cache Layer
         (memory + localStorage)
```

### Error Handling

- Use the utilities from `src/utils/errors.ts` for consistent error handling
- Use type guards from `src/utils/typeGuards.ts` for type-safe checks
- Log errors using `src/utils/logger.ts` for consistent formatting

## Questions?

If you have questions about contributing, please open an issue for discussion.
