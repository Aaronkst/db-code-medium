use regex::Regex;
use serde_json::json;
use serde_json::Value;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
// use web_sys::console;

#[wasm_bindgen]
pub fn add_numbers(a: i32, b: i32) -> i32 {
    a + b
}

#[wasm_bindgen]
pub fn convert_to_typeorm(json_str: &str) -> String {
    let data: Value = serde_json::from_str(json_str).expect("Invalid JSON");
    let table_name = data["data"]["name"].as_str().unwrap_or("Entity");
    let columns: &Vec<Value> = match data["data"]["columns"].as_array() {
        Some(array) => array,
        None => &vec![], // Create an empty Vec explicitly
    };

    let mut entity_code = format!("@Entity()\nexport class {} {{\n", table_name);

    for column in columns {
        let column_name = column["name"].as_str().unwrap_or("").to_string();
        let db_name = column["dbName"].as_str().unwrap_or("").to_string();
        let default_value = column["defaultValue"].as_str().unwrap_or("").to_string();
        let data_type = column["dataType"].as_str().unwrap_or("string");
        let is_nullable = column["nullable"].as_bool().unwrap_or(false);
        let is_primary = column["id"] == data["data"]["primaryKey"];
        let is_index = column["index"].as_bool().unwrap_or(false);
        let is_unique = column["unique"].as_bool().unwrap_or(false);
        let is_auto_increment = column["autoIncrement"].as_bool().unwrap_or(false);
        let length = column["length"].as_u64();
        let precision = column["precision"].as_u64().unwrap_or(0);
        let scale = column["scale"].as_u64().unwrap_or(0);

        // // Convert the column object to a JSON string
        // let column_json = serde_json::to_string_pretty(column)
        //     .unwrap_or_else(|_| "Failed to serialize column".to_string());

        // // Log the JSON string to the console
        // console::log_1(&column_json.into());

        // Check for foreign key
        let foreign_key = column["foreignKey"].as_object();

        let ts_data_type = match data_type {
            "string" => "string",
            "number" => "number",
            "date" => "Date",
            "json" => "any",
            "float" => "number",
            "uuid" => "string",
            "objectId" => "string",
            _ => "unknown",
        };

        let mut column_decorator = String::new();

        if let Some(fk) = foreign_key {
            // Extract foreign key details
            let target_table = fk["target"]["tableName"].as_str().unwrap_or("");
            let target_column = fk["target"]["columnName"].as_str().unwrap_or("");
            let on_delete = fk["onDelete"].as_str().unwrap_or("SET NULL");
            let on_update = fk["onUpdate"].as_str().unwrap_or("CASCADE");
            let mut join_type = fk["type"].as_str().unwrap_or("");

            if join_type == "one-to-one" {
                join_type = "OneToOne"
            }
            if join_type == "one-to-many" {
                join_type = "OneToMany"
            }
            if join_type == "many-to-one" {
                join_type = "ManyToOne"
            }

            if join_type != "many-to-many" {
                // Join column options
                column_decorator.push_str(&format!(
                    "@{}(() => {}, ({}) => {}.{} {{ onDelete: \"{}\", onUpdate: \"{}\" }})\n",
                    join_type,
                    target_table,
                    target_table,
                    target_table,
                    target_column,
                    on_delete,
                    on_update
                ));

                // Join column
                column_decorator.push_str(&format!(
                    "    @JoinColumn({{ name: \"{}\", referencedColumnName: \"{}\" }})",
                    db_name, target_column
                ));
            } else {
                // Join table options
                column_decorator.push_str(&format!(
                    "@ManyToMany(() => {}, ({}) => {}.{} {{ onDelete: \"{}\", onUpdate: \"{}\" }})\n",
                    target_table,
                    target_table,
                    target_table,
                    target_column,
                    on_delete,
                    on_update
                ));
                column_decorator.push_str(&format!(
                    "    @JoinTable({{ name: \"{}_{}\", referencedColumnName: \"{}\" }})",
                    table_name.to_lowercase(),
                    target_table.to_lowercase(),
                    target_column
                ));
            }
        } else if is_primary {
            // Handle primary key or auto increment
            column_decorator = if data_type == "uuid" {
                "@PrimaryGeneratedColumn(\"uuid\")".to_string()
            } else {
                "@PrimaryGeneratedColumn()".to_string()
            };
        } else if is_auto_increment {
            column_decorator = "@PrimaryGeneratedColumn(\"increment\")".to_string();
        } else {
            // Add @Index() if applicable
            if is_index {
                column_decorator.push_str("@Index()\n    ");
            }

            column_decorator.push_str("@Column({ ");

            // Add database name
            if !db_name.is_empty() {
                column_decorator.push_str(&format!("name: \"{}\", ", db_name));
            }

            // Add data type
            column_decorator.push_str(&format!("type: \"{}\"", data_type));

            // Add length
            if let Some(len) = length {
                column_decorator.push_str(&format!(", length: {}", len));
            }

            // Add precision and scale
            if precision > 0 {
                column_decorator.push_str(&format!(", precision: {}", precision));
            }
            if scale > 0 {
                column_decorator.push_str(&format!(", scale: {}", scale));
            }

            // Add nullable
            if is_nullable {
                column_decorator.push_str(", nullable: true");
            }

            // Add unique
            if is_unique {
                column_decorator.push_str(", unique: true");
            }

            // Add default value
            if !default_value.is_empty() {
                column_decorator.push_str(&format!(", default: \"{}\"", default_value));
            }

            column_decorator.push_str(" })");
        }

        // Generate the column definition
        entity_code.push_str(&format!(
            "    {}\n    {}: {};\n\n",
            column_decorator, column_name, ts_data_type
        ));
    }

    // Close the entity definition
    entity_code.push('}');

    entity_code
}

#[wasm_bindgen]
pub fn convert_from_typeorm(typeorm_code: &str) -> String {
    let mut table_object = json!({
        "data": {
            "name": "",
            "columns": [],
            "primaryKey": "",
        }
    });

    // Regex to match the entity class name
    let entity_regex = Regex::new(r"export class (\w+) \{").unwrap();
    if let Some(caps) = entity_regex.captures(typeorm_code) {
        table_object["data"]["name"] = json!(caps[1].to_string());
    }

    // Regex to match column definitions
    let column_regex = Regex::new(r"@Column\(\{([^}]+)\}\)\s+(\w+): (\w+);").unwrap();
    let primary_key_regex = Regex::new(r"@PrimaryGeneratedColumn\(([^)]+)?\)").unwrap();
    let mut primary_key_found = false;

    for line in typeorm_code.lines() {
        if let Some(caps) = primary_key_regex.captures(line) {
            if let Some(primary_key) = caps.get(1) {
                table_object["data"]["primaryKey"] = json!(primary_key.as_str());
            } else {
                table_object["data"]["primaryKey"] = json!("id");
            }
            primary_key_found = true;
        }

        if let Some(caps) = column_regex.captures(line) {
            let column_options = &caps[1];
            let column_name = &caps[2];
            let data_type = &caps[3];

            let mut column_object = json!({
                "name": column_name,
                "dataType": data_type,
                "nullable": false,
                "unique": false,
                "defaultValue": "",
                "length": 0,
                "precision": 0,
                "scale": 0,
                "autoIncrement": false,
                "index": false,
                "foreignKey": null,
            });

            // Parse column options
            for option in column_options.split(',') {
                let parts: Vec<&str> = option.split(':').map(|s| s.trim()).collect();
                if parts.len() == 2 {
                    match parts[0] {
                        "name" => {
                            column_object["dbName"] = json!(parts[1].trim_matches('"'));
                        }
                        "type" => {
                            column_object["dataType"] = json!(parts[1].trim_matches('"'));
                        }
                        "nullable" => {
                            column_object["nullable"] = json!(parts[1] == "true");
                        }
                        "unique" => {
                            column_object["unique"] = json!(parts[1] == "true");
                        }
                        "default" => {
                            column_object["defaultValue"] = json!(parts[1].trim_matches('"'));
                        }
                        "length" => {
                            column_object["length"] = json!(parts[1].parse::<u64>().unwrap_or(0));
                        }
                        "precision" => {
                            column_object["precision"] =
                                json!(parts[1].parse::<u64>().unwrap_or(0));
                        }
                        "scale" => {
                            column_object["scale"] = json!(parts[1].parse::<u64>().unwrap_or(0));
                        }
                        "autoIncrement" => {
                            column_object["autoIncrement"] = json!(parts[1] == "true");
                        }
                        "index" => {
                            column_object["index"] = json!(parts[1] == "true");
                        }
                        _ => {}
                    }
                }
            }

            table_object["data"]["columns"]
                .as_array_mut()
                .unwrap()
                .push(column_object);
        }
    }

    // If no primary key was found, set a default one
    if !primary_key_found {
        table_object["data"]["primaryKey"] = json!("id");
    }

    serde_json::to_string(&table_object).unwrap()
}
