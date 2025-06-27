// .eslintrc.js or next.config.js (ESLint configuration)
module.exports = {
  eslint: {
    // Disable ESLint during builds for deployment
    ignoreDuringBuilds: true,
  },
  // Alternative: If you want to keep ESLint but fix specific rules
  // Add this to your .eslintrc.json instead:
  /*
  {
    "extends": "next/core-web-vitals",
    "rules": {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn", 
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn"
    }
  }
  */
}