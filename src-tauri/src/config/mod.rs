pub mod parser;
pub mod watcher;

use std::path::PathBuf;

pub fn get_aws_config_dir() -> PathBuf {
    let home = homedir::get_my_home().unwrap().unwrap();
    let mut aws_path = PathBuf::from(home);
    aws_path.push(".aws");
    aws_path
}
