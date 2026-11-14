fn main() {
    // The frontend is plain static files embedded at compile time; make sure a
    // change under web/ triggers a rebuild of the binary that embeds them.
    println!("cargo:rerun-if-changed=../web");
    println!("cargo:rerun-if-changed=../web/index.html");
    println!("cargo:rerun-if-changed=../web/js");
    println!("cargo:rerun-if-changed=../web/css");
    tauri_build::build()
}
