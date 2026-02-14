const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the package and workspace node_modules
config.watchFolders = [projectRoot, workspaceRoot];

config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// 2. Force resolution of react and react-native to the example app's node_modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "react" ||
    moduleName === "react-native" ||
    moduleName === "react-native-nitro-modules"
  ) {
    return context.resolveRequest(
      context,
      path.resolve(projectRoot, "node_modules", moduleName),
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 3. Setup nodeModulesPaths for global search
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 4. Disable hierarchical lookup to ensure aliases are prioritized
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
