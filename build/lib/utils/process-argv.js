function getProcessArgvBinIndex() {
    if (isBundledElectronApp())
        return 0;
    return 1;
}
function isBundledElectronApp() {
    return isElectronApp() && !process.defaultApp;
}
function isElectronApp() {
    return !!process.versions.electron;
}
export function getProcessArgvWithoutBin() {
    return process.argv.slice(getProcessArgvBinIndex() + 1);
}
export function getProcessArgvBin() {
    return process.argv[getProcessArgvBinIndex()];
}
