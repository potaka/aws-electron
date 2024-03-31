use derive_new::new;
use std::collections::HashMap;

use serde_derive::{Serialize, Deserialize};

#[derive(new, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub order: isize,

    #[new(default)]
    pub source_profile: Option<String>,

    #[new(default)]
    pub role_arn: Option<String>,

    #[new(default)]
    pub mfa_serial: Option<String>,

    #[new(default)]
    pub additional_properties: std::collections::HashMap<String, String>,
}

#[derive(new, Clone)]
pub struct Credential {
    #[new(default)]
    pub aws_access_key_id: String,

    #[new(default)]
    pub aws_secret_access_key: String,

    #[new(default)]
    pub aws_session_token: Option<String>
}

#[derive(Clone)]
pub struct Config {
    pub config: HashMap<String, Profile>,

    pub credentials_profiles: Vec<String>,

    pub long_term_credentials_profiles: Vec<String>,
}

pub fn get_aws_config() -> Config {
    let config = load_config();
    let credentials: HashMap<String, Credential> = load_credentials();
    let credentials_profiles: Vec<String> = credentials
        .clone()
        .into_keys()
        .map(|profile| {
            String::from(profile)
        })
        .collect();

    let long_term_credentials_profiles = credentials_profiles
        .iter()
        .filter(|&item| {
            let credential: &Credential = credentials
                .get(item)
                .unwrap();
            credential.aws_access_key_id.starts_with("AKIA")
        })
        .map(|value| {
            value.clone()
        })
        .collect();

    Config {
        config,
        credentials_profiles,
        long_term_credentials_profiles,
    }
}

pub fn get_profile_list(
    config: &HashMap<String, Profile>,
    profile_name: &String,
) -> Vec<String> {
    let mut profiles: Vec<String> = Vec::new();
    profiles.push(profile_name.clone());

    let mut profile_config: Option<Profile> = Some(config.get(profile_name).unwrap().clone());
    while profile_config.is_some() &&
        profile_config.as_ref().unwrap().source_profile.is_some() {

        let source_profile: Option<String> = profile_config.clone().unwrap().source_profile;
        if source_profile.is_some() && profiles.iter().any(
            |item| item == source_profile.as_ref().unwrap()
        ) {
            panic!("Loop in profiles: {} {}", profiles.join(", "), source_profile.unwrap());
        }
        profiles.push(source_profile.clone().unwrap());
        let next_profile: Option<Profile> = config.get(&source_profile.unwrap()).cloned();
        if next_profile.is_some() && next_profile.as_ref().unwrap().role_arn.is_none() {
            profiles.reverse();
            return profiles;
        }
        profile_config = next_profile;
    }

    profiles
}

fn is_single_role_assuming_profile(
    profile: &Profile,
    profile_name: &String,
    credentials_profiles: &Vec<String>,
) -> bool {
    let credentials_profile: &String = match &profile.source_profile {
        Some(name) => {
            name
        },
        _ => {
            profile_name
        }
    };

    match profile.role_arn {
        Some(_) => {
            credentials_profiles.iter().any(|p| p == credentials_profile)
        },
        _ => {
            false
        }
    }
}

fn is_multi_stage_role_assuming_profile(
    config: &HashMap<String, Profile>,
    profile_name: &String,
) -> bool {
    let profile_list = get_profile_list(&config, &profile_name);
    if profile_list.len() < 2 {
        return false;
    }

    for profile_name in profile_list {
        let profile = config.get(&profile_name);
        if profile.is_none() {
            return false;
        }

        match profile.unwrap().role_arn {
            None => {
                return false;
            },
            _ => {}
        }
    }

    true
}

pub fn get_cachable_profiles(
    config: &HashMap<String, Profile>,
    long_term_credentials_profiles: &Vec<String>,
) -> HashMap<String, Profile> {
    // TODO implement
    let mfa_profiles: Vec<String> = config.clone().into_keys().filter(|profile_name| {
        let profile = config.get(profile_name).unwrap();
        if profile.mfa_serial.is_none() {
            return false;
        }
        if profile.role_arn.is_some() {
            return false;
        }

        let short_term_credentials_profile = match &profile.source_profile {
            Some(name) => {
                name
            },
            _ => {
                profile_name
            }
        };

        let long_term_credentials_profile = format!("{short_term_credentials_profile}::source-profile");
        long_term_credentials_profiles.iter().any(
            |p| p == &long_term_credentials_profile || p == short_term_credentials_profile
        )
    }).collect();

    let to_remove: Vec<String> = config.clone().into_keys().filter(|profile_name|
       !mfa_profiles.iter().any(|p| p == profile_name)
    ).collect();

    let to_keep: Vec<String> = config.clone().into_keys().filter(|profile_name| !to_remove.iter().any(|p| p == profile_name)).collect();

    let mut rval: HashMap<String, Profile> = HashMap::new();
    for profile in to_keep.iter() {
        rval.insert(profile.clone(), config.get(profile).unwrap().clone());
    }
    rval
}

pub fn get_usable_profiles(
    config: &HashMap<String, Profile>,
    credentials_profiles: &Vec<String>,
) -> Vec<String> {
    config.iter()
        .filter_map(|(profile_name, profile): (&String, &Profile)| {
            if is_single_role_assuming_profile(profile, profile_name, credentials_profiles) ||
                is_multi_stage_role_assuming_profile(config, profile_name) {
                    Some(profile_name.clone())
                } else {
                    None
                }
        }).collect()
}

fn profile_name(profile_name: &str) -> String {
    let parts: Vec<&str> = profile_name.split(" ").collect();
    if parts.len() == 1 {
        String::from(profile_name)
    } else {
        String::from(parts[1])
    }
}

pub fn load_config() -> HashMap<String, Profile> {
    let mut config_path = super::get_aws_config_dir();
    config_path.push("config");


    let ini_file = ini::Ini::load_from_file(config_path).unwrap();
    let mut profiles: HashMap<String, Profile> = HashMap::new();

    let mut index: isize = 0;
    for (section, property) in ini_file.iter() {
        match section {
            Some(name) => {
                let mut profile: Profile = Profile::new(index);
                for(key, value) in property.iter() {
                    match key {
                        "source_profile" => {
                            profile.source_profile = Some(String::from(value));
                        },
                        "role_arn" => {
                            profile.role_arn = Some(String::from(value));
                        },
                        "mfa_serial" => {
                            profile.mfa_serial = Some(String::from(value));
                        },
                        _ => {
                            _ = profile.additional_properties.insert(String::from(key), String::from(value));
                        }
                    }
                }
                profiles.insert(profile_name(name), profile);
            },
            _ => {},
        }
        index = index + 1;
    }

    profiles
}


pub fn load_credentials() -> HashMap<String, Credential> {
    let mut credentials_path = super::get_aws_config_dir();
    credentials_path.push("credentials");

    let ini_file = ini::Ini::load_from_file(credentials_path).unwrap();
    let mut credentials: HashMap<String, Credential> = HashMap::new();

    for (section, property) in ini_file.iter() {
        match section {
            Some(name) => {
                let mut credential: Credential = Credential::new();
                for(key, value) in property.iter() {
                    match key {
                        "aws_access_key_id" => {
                            credential.aws_access_key_id = String::from(value);
                        },
                        "aws_secret_access_key" => {
                            credential.aws_secret_access_key = String::from(value);
                        },
                        "aws_session_token" => {
                            credential.aws_session_token = Some(String::from(value));
                        },
                        _ => {}
                    }
                }
                credentials.insert(String::from(name), credential);
            },
            _ => {},
        }
    }
    credentials
}



