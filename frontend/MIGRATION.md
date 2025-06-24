# Migration from Create React App to Vite

This project has been migrated from Create React App (CRA) to Vite for better performance and TypeScript support.

## Key Changes

### 1. Build System
- **Before**: Create React App (react-scripts)
- **After**: Vite with @vitejs/plugin-react

### 2. Environment Variables
- **Before**: `REACT_APP_` prefix
- **After**: `VITE_` prefix
- **Example**: `REACT_APP_PRIVY_APP_ID` → `VITE_PRIVY_APP_ID`

### 3. Entry Point
- **Before**: `src/index.tsx`
- **After**: `src/main.tsx`

### 4. HTML Template
- **Before**: `public/index.html` with `%PUBLIC_URL%` placeholders
- **After**: `index.html` in root with direct paths

### 5. Scripts
- **Before**: `npm start`, `npm run build`
- **After**: `npm run dev`, `npm run build`

## Installation and Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file** (`.env`):
   ```env
   VITE_PRIVY_APP_ID=your-privy-app-id-here
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Benefits of Migration

- ⚡ **Faster development**: Vite's dev server starts instantly
- 🔧 **Better TypeScript support**: Full TypeScript 5.x compatibility
- 📦 **Smaller bundle size**: Better tree-shaking and optimization
- 🔄 **Hot Module Replacement**: Faster updates during development
- 🎯 **Modern tooling**: ESBuild for faster builds

## Compatibility

- All existing React components work unchanged
- Material-UI, Wagmi, and Privy integrations remain the same
- Environment variables just need prefix change (REACT_APP_ → VITE_)

## Troubleshooting

If you encounter any issues:

1. **Clear node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check environment variables** use `VITE_` prefix

3. **Verify TypeScript configuration** in `tsconfig.json` and `tsconfig.node.json` 