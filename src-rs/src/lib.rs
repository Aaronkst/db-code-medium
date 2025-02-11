mod helpers;

use nanoid::nanoid;
use regex::Regex;
use serde_json::json;
use serde_json::Value;
// use std::collections::HashMap;
use wasm_bindgen::prelude::*;

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
        let data_type = column["dataType"].as_str().unwrap_or("string");
        let is_primary = column["id"] == data["data"]["primaryKey"];
        let is_index = column["index"].as_bool().unwrap_or(false);
        let is_unique = column["unique"].as_bool().unwrap_or(false);
        let is_nullable = column["nullable"].as_bool().unwrap_or(false);
        let default_value = column["defaultValue"].as_str().unwrap_or("").to_string();
        let length = column["length"].as_u64();
        let precision = column["precision"].as_u64().unwrap_or(0);
        let scale = column["scale"].as_u64().unwrap_or(0);
        let collation = column["collation"].as_str().unwrap_or("").to_string();
        let is_auto_increment = column["autoIncrement"].as_bool().unwrap_or(false);
        let select = column["select"].as_bool().unwrap_or(true);
        let zerofill = column["zerofill"].as_bool().unwrap_or(false);
        let column_enum_vec: Vec<String> = column["enum"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|val| val.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_else(Vec::new); // Use unwrap_or_else to avoid unnecessary allocation
        let column_enum: &Vec<String> = &column_enum_vec; // Reference the stable variable
        let column_enum_name = column["enumName"].as_str().unwrap_or("");
        let hstore_type = column["hstoreType"].as_str().unwrap_or("").to_string();
        let is_array = column["array"].as_bool().unwrap_or(false);

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

            if !db_name.is_empty() {
                column_decorator.push_str(&format!("name: \"{}\", ", db_name));
            }
            column_decorator.push_str(&format!("type: \"{}\"", data_type));
            if is_unique {
                column_decorator.push_str(", unique: true");
            }
            if is_nullable {
                column_decorator.push_str(", nullable: true");
            }
            if !default_value.is_empty() {
                column_decorator.push_str(&format!(", default: \"{}\"", default_value));
            }
            if let Some(len) = length {
                column_decorator.push_str(&format!(", length: {}", len));
            }
            if precision > 0 {
                column_decorator.push_str(&format!(", precision: {}", precision));
            }
            if scale > 0 {
                column_decorator.push_str(&format!(", scale: {}", scale));
            }
            if !collation.is_empty() {
                column_decorator.push_str(&format!(", collation: \"{}\"", collation));
            }
            if !select {
                column_decorator.push_str(", select: false");
            }
            /* MySQL Options */
            if zerofill {
                column_decorator.push_str(", zerofill: true");
            }
            if column_enum.len() > 0 {
                column_decorator
                    .push_str(&format!(", enum: \"[\"{}\"]\"", column_enum.join("\", \"")));
            }
            if !column_enum_name.is_empty() {
                column_decorator.push_str(&format!(", enumName: \"{}\"", column_enum_name));
            }
            if !hstore_type.is_empty() {
                column_decorator.push_str(&format!(", hstoreType: \"{}\"", hstore_type));
            }
            if !is_array {
                column_decorator.push_str(", array: true");
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
    let table_id = nanoid!();
    let mut table_object = json!({
        "id": table_id,
        "type": "table",
        "data": {
            "id": table_id,
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

    // Regex for column name and type e.g. `name: string;`
    let column_name_type_regex = Regex::new(r"(\w+): ([\w<>, |]+)").unwrap();

    // Regex for `@Column` with options
    let column_with_options_regex = Regex::new(r"@Column\(\s*([^)]*)\s*\)").unwrap();

    // Regex for `@PrimaryGeneratedColumn` with options
    let primary_key_with_options_regex =
        Regex::new(r"@PrimaryGeneratedColumn\(\s*([^)]*)\s*\)").unwrap();

    // Regexes to extract options from join decorators
    let target_table_regex = Regex::new(r"\(\s*\)\s*=>\s*(\w+)").unwrap();
    let target_column_regex = Regex::new(r"\((\w+)\)\s*=>\s*(\w+).(\w+)").unwrap();
    let join_options_regex = Regex::new(r",\s*\{\s*([^)]*)\s*\}").unwrap();

    let join_column_with_options_regex = Regex::new(r"@JoinColumn\(\s*([^)]*)\s*\)").unwrap();
    let join_table_with_options_regex = Regex::new(r"@JoinTable\(\s*([^)]*)\s*\)").unwrap();

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
        let mut is_primary = false;

        let mut column_name = String::new();
        let mut data_type = String::new();
        let mut column_options = String::new();

        let is_index = line.contains("@Index()");

        // basic column.
        if line.contains("@Column") {
            found_column = true;

            println!("Found a basic column: {}", line);
            if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
                if let Some(content) = caps.get(1) {
                    column_name = content.as_str().into();
                }
                if let Some(content) = caps.get(2) {
                    data_type = content.as_str().into();
                }
            }

            // Check for options
            if let Some(caps) = column_with_options_regex.captures(line) {
                column_options = caps[1].to_string();
            }
        }

        // primary key.
        if line.contains("@PrimaryGeneratedColumn") {
            found_column = true;
            is_primary = true;

            println!("Found a primary key: {}", line);
            if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
                if let Some(content) = caps.get(1) {
                    column_name = content.as_str().into();
                }
                if let Some(content) = caps.get(2) {
                    data_type = content.as_str().into();
                }
            }

            // Check for options
            if let Some(caps) = primary_key_with_options_regex.captures(line) {
                column_options = caps[1].to_string();
            }
        }

        // Extract @OneToOne relationships
        if line.contains("@OneToOne") {
            // foreign key.
            found_column = true;
            current_foreign_key["type"] = json!("one-to-one");

            println!("Found a many-to-one key: {}", line);
            if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
                if let Some(content) = caps.get(1) {
                    column_name = content.as_str().into();
                }
                if let Some(content) = caps.get(2) {
                    data_type = content.as_str().into();
                }
            }
        }

        // Extract @ManyToOne relationships
        if line.contains("@ManyToOne") {
            // foreign key.
            found_column = true;
            current_foreign_key["type"] = json!("many-to-one");

            println!("Found a many-to-one key: {}", line);
            if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
                if let Some(content) = caps.get(1) {
                    column_name = content.as_str().into();
                }
                if let Some(content) = caps.get(2) {
                    data_type = content.as_str().into();
                }
            }
        }

        // Extract @OneToMany relationships
        if line.contains("@OneToMany") {
            // foreign key.
            found_column = true;
            current_foreign_key["type"] = json!("one-to-many");

            println!("Found a many-to-one key: {}", line);
            if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
                if let Some(content) = caps.get(1) {
                    column_name = content.as_str().into();
                }
                if let Some(content) = caps.get(2) {
                    data_type = content.as_str().into();
                }
            }
        }

        // Extract @ManyToMany relationships
        if line.contains("@ManyToMany") {
            // foreign key.
            found_column = true;
            current_foreign_key["type"] = json!("many-to-many");

            println!("Found a many-to-one key: {}", line);
            if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
                if let Some(content) = caps.get(1) {
                    column_name = content.as_str().into();
                }
                if let Some(content) = caps.get(2) {
                    data_type = content.as_str().into();
                }
            }
        }

        if current_foreign_key["type"] != json!(null) {
            let mut target_table = "".to_string();
            let mut target_column = "".to_string();

            if let Some(caps) = target_table_regex.captures(line) {
                target_table = caps[1].to_string()
            }

            if let Some(caps) = target_column_regex.captures(line) {
                target_column = caps[3].to_string()
            };

            current_foreign_key["target"] = json!({
                "table": target_table,
                "column": target_column
            });

            if let Some(caps) = join_options_regex.captures(line) {
                let options = "{".to_owned() + caps[1].to_string().as_str() + "}";
                let options_json = helpers::parse_json(options.as_str());

                if let Some(obj) = options_json.as_object() {
                    for (key, value) in obj {
                        match key.as_str() {
                            "onDelete" => current_foreign_key["onDelete"] = value.clone(),
                            "onUpdate" => current_foreign_key["onUpdate"] = value.clone(),
                            _ => {}
                        }
                    }
                }
            }
        }

        println!(
            "foreign key options: {}",
            serde_json::to_string(&current_foreign_key).unwrap()
        );

        // Extract columns
        if found_column {
            let column_id = nanoid!();
            let mut column_object = json!({
                "id": column_id,
                "name": column_name,
                "dbName": column_name,
                "dataType": data_type,
                "primaryKey": is_primary,
                "index": is_index,
                "unique": false,
                "nullable": false,
                "defaultValue": null,
                "length": 255,
                "precision": null,
                "scale": null,
                "collation": null,
                "description": "",
                "autoIncrement": false,
                "foreignKey": null,
                "select": true,
                "zerofill": false,
                "enum": null,
                "enumName": null,
                "hstoreType": null,
                "array": false
            });

            if is_primary {
                // column_options is string for data type2_
                table_object["data"]["primaryKey"] = json!(column_id);

                if column_options.is_empty() {
                    column_options = "number".to_string();
                } else {
                    column_options = helpers::trim_quotes(&column_options).to_string();
                }

                if let Some(obj) = column_object.as_object_mut() {
                    obj.insert("dataType".to_string(), json!(column_options));
                } else {
                    println!("column_object is not an object");
                }
            } else if current_foreign_key["type"] != json!(null) {
                // join column props
                if line.contains("@JoinColumn") {
                    if let Some(caps) = join_column_with_options_regex.captures(line) {
                        column_options = caps[1].to_string();
                    }
                    println!("join column options: {}", column_options);
                    let options_json = helpers::parse_json(column_options.as_str());
                    if let Some(obj) = options_json.as_object() {
                        for (key, value) in obj {
                            match key.as_str() {
                                "name" => column_object["dbName"] = value.clone(),
                                "referencedColumnName" => {
                                    current_foreign_key["target"]["column"] = value.clone()
                                }
                                _ => {}
                            }
                        }
                    }
                }

                // join table props
                if line.contains("@JoinTable") {
                    if let Some(caps) = join_table_with_options_regex.captures(line) {
                        column_options = caps[1].to_string();
                    }
                    println!("join table options: {}", column_options);
                    let options_json = helpers::parse_json(column_options.as_str());
                    if let Some(obj) = options_json.as_object() {
                        for (key, value) in obj {
                            match key.as_str() {
                                "name" => current_foreign_key["through"] = value.clone(),
                                "joinColumn" => {
                                    current_foreign_key["target"]["column"] =
                                        value["referencedColumnName"].clone();
                                    column_object["dbName"] = value["name"].clone()
                                }
                                "inverseJoinColumn" => {
                                    current_foreign_key["inverseColumn"]["dbName"] =
                                        value["name"].clone();
                                    current_foreign_key["inverseColumn"]["value"] =
                                        value["referencedColumnName"].clone();
                                }
                                _ => {}
                            }
                        }
                    }
                }

                column_object
                    .as_object_mut()
                    .unwrap()
                    .insert("foreignKey".to_string(), json!(current_foreign_key));
            } else {
                // parse basic column options
                println!("column options: {}", column_options);
                let options_json = helpers::parse_json(column_options.as_str());

                if let Some(obj) = options_json.as_object() {
                    for (key, value) in obj {
                        match key.as_str() {
                            "name" => column_object["dbName"] = value.clone(),
                            "type" => column_object["dataType"] = value.clone(),
                            "index" => column_object["index"] = value.clone(),
                            "unique" => column_object["unique"] = value.clone(),
                            "nullable" => column_object["nullable"] = value.clone(),
                            "default" => column_object["defaultValue"] = value.clone(),
                            "length" => column_object["length"] = value.clone(),
                            "precision" => column_object["precision"] = value.clone(),
                            "scale" => column_object["scale"] = value.clone(),
                            "collation" => column_object["collation"] = value.clone(),
                            "autoIncrement" => column_object["autoIncrement"] = value.clone(),
                            "select" => column_object["select"] = value.clone(),
                            "zerofill" => column_object["zerofill"] = value.clone(),
                            "enum" => {
                                column_object["enum"] = value
                                    .clone()
                                    .to_string()
                                    .split(",")
                                    .map(|s| Value::String(s.to_string())) // Convert each item to Value::String
                                    .collect()
                            }
                            "enumName" => column_object["enumName"] = value.clone(),
                            "hstoreType" => column_object["hstoreType"] = value.clone(),
                            "array" => column_object["array"] = value.clone(),
                            _ => {}
                        }
                    }
                }
            }

            // Add the column object to the table's columns array
            table_object["data"]["columns"]
                .as_array_mut()
                .unwrap()
                .push(column_object);
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

        println!("--------");
    }

    // Return the table object as a JSON string
    serde_json::to_string(&table_object).unwrap()
}

// fn main() {
//     // TODO: more testings.
//     let test_entity = r#"
//     export class Product {
//         @PrimaryGeneratedColumn("uuid")  @Index() id: string;
//         @Column({ default: "Sample" })  @Index() name: string;
//         @Column( { nullable: true, default: 1 } ) price: number;
//         @ManyToMany(() => Abcdef, (Abcdef) => Abcdef.id, { nullable: true, onDelete: "SET NULL" }) @JoinTable({name: "owner_target"}) abcdef: Abcdef;
//         @OneToOne(() => Abcdef, (Abcdef) => Abcdef.id, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({name: "abcdef_id"}) abcdef: Abcdef;
//     }"#;

//     let result = convert_from_typeorm(test_entity);
//     println!("{}", result);
// }
