# Contributing to Collapse

Thank you for your interest in contributing to Collapse! We welcome all contributions, whether it's reporting bugs, suggesting features, or submitting code changes.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Code Style Guide](#code-style-guide)
- [License](#license)

## Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Bugs are tracked as [GitHub issues](https://github.com/ellie-linehan/collapse-extension/issues). When creating a bug report, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected vs. actual behavior
4. Browser and extension version
5. Any relevant screenshots or console logs

### Suggesting Enhancements

We welcome enhancement suggestions. Please include:

1. A clear, descriptive title
2. A detailed description of the enhancement
3. Why this would be useful
4. Any alternative solutions you've considered

### Your First Code Contribution

1. Fork the repository
2. Create a new branch for your feature/fix
3. Make your changes
4. Add tests if applicable
5. Run tests and ensure they pass
6. Submit a pull request

## Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/ellie-linehan/collapse-extension.git
   cd collapse-extension
   ```

2. Install dependencies (if any)
   ```bash
   npm install
   ```

3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Ensure your code follows the style guide
3. Update the version number in `manifest.json` following semantic versioning
4. The pull request will be reviewed by maintainers

## Code Style Guide

- Use consistent indentation (2 spaces)
- Follow existing code style
- Add comments for complex logic
- Keep functions small and focused
- Write meaningful commit messages

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
