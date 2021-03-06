const fs = require("fs").promises;

const cxx = "em++";
const exportName = "-s EXPORT_NAME='_libflifem' -s MODULARIZE=1";
const ports = "-s USE_LIBPNG=1 -s USE_ZLIB=1";
const optimizations = "-D NDEBUG -O2 -ftree-vectorize";
const flags = "-D LODEPNG_NO_COMPILE_PNG -D LODEPNG_NO_COMPILE_DISK";
const commandMisc = `-s ALLOW_MEMORY_GROWTH=1 -s WASM=1 -s NODERAWFS=1 -s NODE_CODE_CACHING=1 -s WASM_ASYNC_COMPILATION=0 -s EXTRA_EXPORTED_RUNTIME_METHODS=["callMain"]`;

const output = "lib/flif.js"

// copied file list on the upstream makefile
// JSON.stringify((list).split(" "), null, 4)
const filesO = [
    "maniac/chance.o",
    "maniac/symbol.o",
    "image/crc32k.o",
    "image/image.o",
    "image/image-png.o",
    "image/image-pnm.o",
    "image/image-pam.o",
    "image/image-rggb.o",
    "image/image-metadata.o",
    "image/color_range.o",
    "transform/factory.o",
    "common.o",
    "flif-enc.o",
    "flif-dec.o",
    "io.o",
    "../extern/lodepng.o"
].map(item => appendDir(item));

for (const fileO of [appendDir("flif.o")].concat(filesO)) {
    const fileCpp = `${fileO.slice(0, -1)}cpp`;
    file(fileO, [fileCpp], async () => {
        const command = `${cxx} ${flags} -std=c++11 ${ports} ${optimizations} -g0 -Wall ${fileCpp} -c -o ${fileO}`;
        console.log(command);
        await asyncExec([command]);
    });
}

/** @param {string} path  */
function appendDir(path) {
    return `submodules/flif/src/${path}`;
}

const jakeExecOptionBag = {
    printStdout: true,
    printStderr: true
};

/**
 * @param {string[]} cmds
 * @return {Promise<void>}
 */
function asyncExec(cmds) {
    return new Promise((resolve, reject) => {
        try {
            jake.exec(cmds, resolve, jakeExecOptionBag)
        }
        catch (e) {
            reject(e);
        }
    });
}

desc("Build FLIF command-line encoding/decoding tool");
file(output, [appendDir("flif.o")].concat(filesO), async () => {
    const command = `${cxx} ${flags} -s INVOKE_RUN=0 ${commandMisc} -std=c++11 ${exportName} ${ports} ${optimizations} -g0 -Wall ${filesO.join(' ')} ${appendDir("flif.o")} -o ${output}`;
    console.log(command);
    await asyncExec([command]);
});

desc("Builds libflif.js");
task("default", [output]);

desc("clean");
task("clean", async () => {
    for (const file of ["flif.js", "flif.wasm"]) {
        try {
            await fs.unlink(`lib/${file}`);
        }
        catch (ignore) {}
    }
})
