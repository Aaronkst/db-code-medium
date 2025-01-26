use regex::Regex;
use serde_json::json;
use serde_json::Value;
// use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use web_sys::console;

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
        "type": "table",
        "data": {
            "name": "",
            "dbName": "",
            "primaryKey": "",
            "description": "",
            "timestamps": true,
            "engine": "InnoDB",
            "columns": [],
            "joins": []
        },
    });

    let entity_regex = Regex::new(r"export class (\w+) \{").unwrap();

    // Regex for @Column without options
    let column_basic_regex = Regex::new(r"@Column\(\)\s*(\w+): ([\w<>, |]+);").unwrap();
    // Regex for @Column with options
    let column_with_options_regex =
        Regex::new(r"@Column\(\s*([^)]*)\s*\)\s*(\w+): ([\w<>, |]+);").unwrap();

    // Regex for @Column without options
    let primary_key_column_basic_regex =
        Regex::new(r"@PrimaryGeneratedColumn\(\)\s*(\w+): ([\w<>, |]+);").unwrap();
    // Regex for @Column with options
    let primary_key_column_with_options_regex =
        Regex::new(r"@PrimaryGeneratedColumn\(\s*([^)]*)\s*\)\s*(\w+): ([\w<>, |]+);").unwrap();

    let many_to_one_regex = Regex::new(r"@ManyToOne\(([^)]+)?\)").unwrap();
    let one_to_many_regex = Regex::new(r"@OneToMany\(([^)]+)?\)").unwrap();
    let many_to_many_regex = Regex::new(r"@ManyToMany\(([^)]+)?\)").unwrap();
    let one_to_one_regex = Regex::new(r"@OneToOne\(([^)]+)?\)").unwrap();
    let join_column_regex = Regex::new(r"@JoinColumn\(\{([^}]+)\}\)").unwrap();
    let join_table_regex = Regex::new(r"@JoinTable\(\{([^}]+)\}\)").unwrap();

    let lines: Vec<&str> = typeorm_code.lines().collect();

    let mut found_entity = false;
    let mut current_foreign_key = json!({
        "target": null,
        "onDelete": "RESTRICT",
        "onUpdate": "RESTRICT",
        "through": null,
        "source": null,
        "type": null
    });

    for line in lines {
        let line = line.trim();
        console::log_1(&format!("Processing line: {}", line).into());

        if !found_entity {
            // Check for the single entity class definition
            if let Some(caps) = entity_regex.captures(line) {
                found_entity = true;
                let entity_name = caps[1].to_string();
                table_object["data"]["name"] = json!(entity_name);
            }
            continue;
        }

        let mut found_column = false;
        let mut column_name = String::new();
        let mut data_type = String::new();
        let mut column_options = String::new();

        // Check for columns without options
        if let Some(caps) = column_basic_regex.captures(line) {
            column_name = caps[1].to_string();
            data_type = caps[2].to_string();
            found_column = true;
            println!("Found column: {} with type: {}", column_name, data_type);
        }

        // Check for columns with options
        if let Some(caps) = column_with_options_regex.captures(line) {
            column_options = caps[1].to_string();
            column_name = caps[2].to_string();
            data_type = caps[3].to_string();
            found_column = true;
            println!(
                "Found column with options: {} with type: {}",
                column_name, data_type
            );
            println!("Options: {}", column_options);
        }

        // Check for columns without options
        if let Some(caps) = primary_key_column_basic_regex.captures(line) {
            column_name = caps[1].to_string();
            data_type = caps[2].to_string();
            found_column = true;
            println!("Found column: {} with type: {}", column_name, data_type);
        }

        // Check for columns with options
        if let Some(caps) = primary_key_column_with_options_regex.captures(line) {
            column_options = caps[1].to_string();
            column_name = caps[2].to_string();
            data_type = caps[3].to_string();
            found_column = true;
            println!(
                "Found column with options: {} with type: {}",
                column_name, data_type
            );
            println!("Options: {}", column_options);
        }

        // Handle case where @Column() is followed by the column on the next line
        if line.contains(":") && !line.contains("@Column") {
            if !column_name.is_empty() && !data_type.is_empty() {
                println!("Column: {} with type: {}", column_name, data_type);
                println!("Options: {}", column_options);
                column_name.clear();
                data_type.clear();
                column_options.clear();
            }
        }

        // Extract columns
        if found_column {
            // let column_options = caps.get(1).map(|m| m.as_str()).unwrap_or("{}");
            // let column_name = &caps[2];
            // let data_type = &caps[3];

            // Log the column details being processed
            console::log_1(
                &format!(
                    "Found column - Name: {}, Type: {}, Options: {}",
                    column_name, data_type, column_options
                )
                .into(),
            );

            let mut column_object = json!({
                "name": column_name,
                "dbName": column_name,
                "dataType": data_type,
                "primaryKey": false,
                "index": false,
                "unique": false,
                "nullable": false,
                "defaultValue": null,
                "length": 0,
                "precision": null,
                "scale": null,
                "collation": "",
                "description": "",
                "autoIncrement": false,
                "foreignKey": null,
            });

            // Parse column options
            let options_json: serde_json::Value =
                serde_json::from_str(&column_options).unwrap_or_else(|_| json!({}));

            if let Some(obj) = options_json.as_object() {
                for (key, value) in obj {
                    match key.as_str() {
                        "name" => column_object["dbName"] = value.clone(),
                        "type" => column_object["dataType"] = value.clone(),
                        "nullable" => column_object["nullable"] = value.clone(),
                        "unique" => column_object["unique"] = value.clone(),
                        "default" => column_object["defaultValue"] = value.clone(),
                        "length" => column_object["length"] = value.clone(),
                        "precision" => column_object["precision"] = value.clone(),
                        "scale" => column_object["scale"] = value.clone(),
                        "autoIncrement" => column_object["autoIncrement"] = value.clone(),
                        "index" => column_object["index"] = value.clone(),
                        _ => {}
                    }
                }
            }

            // Add the column object to the table's columns array
            table_object["data"]["columns"]
                .as_array_mut()
                .unwrap()
                .push(column_object);
        }

        // Extract @ManyToOne relationships
        if let Some(_caps) = many_to_one_regex.captures(line) {
            current_foreign_key["type"] = json!("many-to-one");
        }

        // Extract @OneToMany relationships
        if let Some(_caps) = one_to_many_regex.captures(line) {
            current_foreign_key["type"] = json!("one-to-many");
        }

        // Extract @ManyToMany relationships
        if let Some(_caps) = many_to_many_regex.captures(line) {
            current_foreign_key["type"] = json!("many-to-many");
        }

        // Extract @OneToOne relationships
        if let Some(_caps) = one_to_one_regex.captures(line) {
            current_foreign_key["type"] = json!("one-to-one");
        }

        // Extract @JoinColumn
        if let Some(caps) = join_column_regex.captures(line) {
            let join_options = &caps[1];
            for option in join_options.split(',') {
                let parts: Vec<&str> = option.split(':').map(|s| s.trim()).collect();
                if parts.len() == 2 {
                    match parts[0] {
                        "name" => {
                            current_foreign_key["source"] = json!({
                                "tableName": table_object["data"]["name"],
                                "columnName": parts[1].trim_matches('"')
                            });
                        }
                        "referencedColumnName" => {
                            if let Some(target) = current_foreign_key["target"].as_object_mut() {
                                target["columnName"] = json!(parts[1].trim_matches('"'));
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        // Extract @JoinTable
        if let Some(caps) = join_table_regex.captures(line) {
            let join_options = &caps[1];
            for option in join_options.split(',') {
                let parts: Vec<&str> = option.split(':').map(|s| s.trim()).collect();
                if parts.len() == 2 {
                    match parts[0] {
                        "name" => {
                            current_foreign_key["through"] = json!(parts[1].trim_matches('"'));
                        }
                        _ => {}
                    }
                }
            }
        }

        // Add the foreign key object to the joins array when complete
        if current_foreign_key["type"] != json!(null) {
            table_object["data"]["joins"]
                .as_array_mut()
                .unwrap()
                .push(current_foreign_key.clone());

            // Reset the foreign key object for the next relationship
            current_foreign_key = json!({
                "target": null,
                "onDelete": "RESTRICT",
                "onUpdate": "RESTRICT",
                "through": null,
                "source": null,
                "type": null
            });
        }
    }

    // Return the table object as a JSON string
    serde_json::to_string(&table_object).unwrap()
}
