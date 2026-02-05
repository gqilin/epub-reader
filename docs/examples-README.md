# EPUB Reader Examples

This directory contains example implementations demonstrating how to use the EPUB Reader library with various frameworks and use cases.

## 📁 Directory Structure

```
examples/
├── vue3/                   # Vue 3 example with full annotation support
│   ├── src/
│   │   ├── components/      # Vue components
│   │   │   ├── EpubViewer.vue    # Main EPUB viewer with annotations
│   │   │   ├── EpubLoader.vue    # EPUB file loader
│   │   │   └── EpubInfo.vue      # EPUB metadata display
│   │   └── main.ts           # Application entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
└── README.md                 # This file
```

## 🚀 Vue 3 Example

The Vue 3 example demonstrates the complete EPUB reader with annotation features:

### Features Demonstrated
- ✨ **EPUB Loading**: Load and parse EPUB files
- 📖 **Chapter Navigation**: Navigate between chapters
- 🎨 **Annotation System**: Full annotation support with 6 underline styles
- 🐛 **Debug Tools**: Comprehensive debugging panel
- 📱 **Responsive Design**: Mobile-friendly interface
- 💾 **Data Persistence**: LocalStorage with import/export

### Running the Example

```bash
cd examples/vue3
npm install
npm run dev
```

The example will be available at `http://localhost:3000` (or next available port).

### Key Components

#### EpubViewer.vue
The main component that integrates EPUB reading with annotation features:
- Chapter navigation controls
- Annotation toggle and management
- Debug panel access
- Responsive design

#### EpubLoader.vue
File upload component for loading EPUB files:
- Drag-and-drop support
- File validation
- Loading states

#### EpubInfo.vue
Display EPUB metadata:
- Title, author, description
- Table of contents
- Cover image display

## 🎯 Annotation Features

The Vue example showcases all annotation capabilities:

### Mark Types
- 🟨 **Highlight**: Traditional highlighting
- U̲ **Underline**: 6 different underline styles
- 📝 **Note**: Annotations with text notes
- 🔖 **Bookmark**: Quick position marking

### Underline Styles
1. 📏 **Solid**: Traditional straight line
2. ➖ **Dashed**: Dashed line pattern
3. ⚫ **Dotted**: Dotted line pattern
4. 〰️ **Wavy**: Wavy line with sine function
5. ══ **Double**: Double parallel lines
6. ▬ **Thick**: Thick rectangular line

### Debug Tools
- Storage statistics
- Current chapter annotation count
- Style distribution analysis
- Manual re-rendering controls
- Data export/import functionality

## 🛠️ Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Build Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run build  # vue-tsc included in build
```

### Configuration
- **Vite**: Build tool and development server
- **TypeScript**: Full type support
- **Vue 3**: Composition API with `<script setup>`

## 📱 Mobile Compatibility

The Vue example is fully responsive and optimized for mobile devices:
- Touch-friendly controls
- Adaptive toolbar positioning
- Optimized debugging interface
- Gesture support for text selection

## 🎨 Customization

### Styling
The example uses Vue's scoped CSS with a clean, modern design:
- Consistent color scheme
- Smooth transitions
- Hover effects
- Dark mode support (can be extended)

### Configuration
The annotation system can be customized through:
- Color themes
- Style presets
- Toolbar configuration
- Debug options

## 🔧 Extending the Example

### Adding New Features
1. **Custom Annotation Types**: Extend the `AnnotationType` enum
2. **New Underline Styles**: Add new rendering methods to `SVGOverlayManager`
3. **Additional Debug Tools**: Extend the debug panel
4. **Theme Support**: Add theme switching functionality

### Integration
The example can be integrated into larger applications:
- Embed as a component
- Use with routing
- Combine with state management
- Integrate with backend services

## 📚 Related Documentation

- **[Annotation Features Guide](../docs/ANNOTATION_FEATURES.md)** - Complete annotation documentation
- **[API Reference](../docs/api/epub-reader.md)** - Core API documentation
- **[Type Definitions](../docs/api/types.md)** - TypeScript types

## 🤝 Contributing

To contribute to the examples:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

The examples are licensed under the same MIT license as the core library.

---

**Tip**: Start with the Vue 3 example to understand the complete integration of EPUB reading with annotation features. The code is well-commented and follows best practices for Vue 3 development.