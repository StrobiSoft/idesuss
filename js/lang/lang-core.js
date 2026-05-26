export function getText(langPack, path, fallback = "") {
  return path.split(".").reduce((obj, key) => {
    return obj && obj[key] !== undefined ? obj[key] : undefined;
  }, langPack) ?? fallback;
}