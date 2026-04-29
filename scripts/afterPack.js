const path = require("path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const { rcedit } = await import("rcedit");
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, "assets", "icon.ico");
  const version = context.packager.appInfo.version;
  const productName = context.packager.appInfo.productName;

  await rcedit(exePath, {
    "version-string": {
      FileDescription: productName,
      ProductName: productName,
      InternalName: productName,
      OriginalFilename: `${productName}.exe`,
      CompanyName: "Todd Chou",
      LegalCopyright: `Copyright (C) ${new Date().getFullYear()} Todd Chou`,
    },
    "file-version": version,
    "product-version": version,
    icon: iconPath,
    "requested-execution-level": "asInvoker",
  });
};
