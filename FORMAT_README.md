# HTML Formatter

This project includes tools to format your HTML files using Prettier, a popular code formatter.

## Available Commands

You can format your HTML files using the following commands:

### Format all HTML files in the client directory

```bash
npm run format
```

This command will run the custom script that:
1. Checks if Prettier is installed (and installs it if not)
2. Finds all HTML files in the client directory
3. Formats them according to the settings in `.prettierrc`

### Check if HTML files are formatted correctly

```bash
npm run format:check
```

This command will check if your HTML files conform to the Prettier formatting rules without making any changes.

### Format all HTML files directly with Prettier

```bash
npm run format:all
```

This command will directly use Prettier to format all HTML files in the client directory.

## Customizing Formatting Rules

You can customize the formatting rules by editing the `.prettierrc` file in the root directory. The current settings are:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "htmlWhitespaceSensitivity": "css",
  "endOfLine": "lf",
  "embeddedLanguageFormatting": "auto"
}
```

Feel free to adjust these settings according to your preferences.

## Why Use a Formatter?

Using a formatter like Prettier helps maintain consistent code style across your project, making your code more readable and easier to maintain. It also eliminates debates about code style in team settings. 