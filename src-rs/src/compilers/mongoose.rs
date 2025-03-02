#[path = "../utils/helpers.rs"]
mod helpers;

use serde_json::{json, Value};

/**
Convert nodes to typeORM syntax.
*/
pub fn convert_to_mongoose(json_str: &str) -> String {
    let mut entity_codes: Vec<String> = Vec::new();
    if let Some(json_array) = helpers::parse_json(json_str).as_array_mut() {
        for data in json_array {
            let table_name = data["data"]["name"].as_str().unwrap_or("Entity");
            let mut entity_code = format!("@Entity()\nexport class {} {{\n", table_name);

            if let Some(columns) = data["data"]["columns"].as_array() {
                for column in columns {
                    let column_name = column["name"].as_str().unwrap_or("").to_string();
                    let db_name = column["dbName"].as_str().unwrap_or("").to_string();
                    let data_type = column["dataType"].as_str().unwrap_or("string");
                    let is_primary = column["primaryKey"].as_bool().unwrap_or(false);
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
                        _ => data_type,
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
                                    "@{}(() => {}, ({}) => {}.{}, {{ onDelete: \"{}\", onUpdate: \"{}\" }})\n",
                                    join_type,
                                    target_table,
                                    target_table.to_lowercase(),
                                    target_table.to_lowercase(),
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
                                    "@ManyToMany(() => {}, ({}) => {}.{}, {{ onDelete: \"{}\", onUpdate: \"{}\" }})\n",
                                    target_table,
                                    target_table.to_lowercase(),
                                    target_table.to_lowercase(),
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
                        if is_index {
                            column_decorator.push_str("\n    @Index()");
                        }
                        // Generate the column definition
                        entity_code.push_str(&format!(
                            "    {}\n    {}: {};\n\n",
                            column_decorator, column_name, target_table
                        ));
                    } else if is_primary {
                        // Handle primary key or auto increment
                        column_decorator = if data_type == "uuid" {
                            "@PrimaryGeneratedColumn(\"uuid\")".to_string()
                        } else {
                            "@PrimaryGeneratedColumn()".to_string()
                        };
                        if is_index {
                            column_decorator.push_str("\n    @Index()");
                        }
                        // Generate the column definition
                        entity_code.push_str(&format!(
                            "    {}\n    {}: {};\n\n",
                            column_decorator, column_name, ts_data_type
                        ));
                    } else if is_auto_increment {
                        column_decorator = "@PrimaryGeneratedColumn(\"increment\")".to_string();
                        if is_index {
                            column_decorator.push_str("\n    @Index()");
                        }
                        // Generate the column definition
                        entity_code.push_str(&format!(
                            "    {}\n    {}: {};\n\n",
                            column_decorator, column_name, ts_data_type
                        ));
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
                            if len != 255 {
                                column_decorator.push_str(&format!(", length: {}", len));
                            }
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
                            column_decorator.push_str(&format!(
                                ", enum: \"[\"{}\"]\"",
                                column_enum.join("\", \"")
                            ));
                        }
                        if !column_enum_name.is_empty() {
                            column_decorator
                                .push_str(&format!(", enumName: \"{}\"", column_enum_name));
                        }
                        if !hstore_type.is_empty() {
                            column_decorator
                                .push_str(&format!(", hstoreType: \"{}\"", hstore_type));
                        }
                        if is_array {
                            column_decorator.push_str(", array: true");
                        }

                        column_decorator.push_str(" })");
                        // Generate the column definition
                        entity_code.push_str(&format!(
                            "    {}\n    {}: {};\n\n",
                            column_decorator, column_name, ts_data_type
                        ));
                    }
                }
                // Close the entity definition
                entity_code.push('}');
            }
            entity_codes.push(entity_code)
        }
    } else {
        return String::new();
    }
    let joined_entities = entity_codes.join("\n");
    joined_entities
}

/**
Convert parsed typORM syntax to nodes.
*/
pub fn convert_from_mongoose(program: &str) -> String {
    String::new()
    // let data = helpers::parse_json(program);

    // let mut tables_vec: Vec<Value> = Vec::new();
    // let empty_array = Vec::new();

    // let body_array = data["body"].as_array().unwrap_or(&empty_array);

    // if body_array.len() > 0 {
    //     for node in body_array {
    //         let node_type = node["type"].as_str().unwrap_or("").to_string();

    //         if node_type == "ClassDeclaration".to_string() {
    //             // Initialize a default table.
    //             let mut table_object = helpers::get_default_table();

    //             let table_name = node["id"]["name"].as_str().unwrap_or("").to_string();
    //             table_object["data"]["name"] = json!(table_name);

    //             let attributes = node["body"]["body"].as_array().unwrap_or(&empty_array);

    //             for attribute in attributes {
    //                 let mut column_object = helpers::get_default_column();

    //                 if let Some(decorators) = attribute.get("decorators").unwrap().as_array() {
    //                     let is_primary_key = column_object["primaryKey"].as_bool().unwrap_or(false);
    //                     let is_foreign_key = column_object["foreignKey"] != json!(null);

    //                     for decorator in decorators {
    //                         let decorator_name = decorator["expression"]["callee"]["name"]
    //                             .as_str()
    //                             .unwrap_or("")
    //                             .to_string();

    //                         let arguments = decorator["expression"]["arguments"]
    //                             .as_array()
    //                             .unwrap_or(&empty_array);

    //                         if decorator_name == "Index" {
    //                             column_object["index"] = json!(true);
    //                             continue;
    //                         }

    //                         if decorator_name == "PrimaryGeneratedColumn" && !is_foreign_key {
    //                             // primary column
    //                             column_object["primaryKey"] = json!(true);

    //                             if arguments.len() > 0 {
    //                                 let argument_type =
    //                                     arguments[0]["type"].as_str().unwrap_or("").to_string();
    //                                 if argument_type == "Literal" {
    //                                     column_object["dataType"] =
    //                                         json!(arguments[0]["value"].as_str().unwrap_or(""));
    //                                 }
    //                             } else {
    //                                 println!("no arguments for primary key.")
    //                             }
    //                             continue;
    //                         }

    //                         let mut join_type = "";
    //                         match decorator_name.as_str() {
    //                             "OneToOne" => join_type = "one-to-one",
    //                             "ManyToOne" => join_type = "many-to-one",
    //                             "OneToMany" => join_type = "one-to-many",
    //                             "ManyToMany" => join_type = "many-to-many",
    //                             _ => {}
    //                         }

    //                         if join_type.len() > 0 && !is_primary_key {
    //                             if arguments.len() > 0 {
    //                                 column_object["foreignKey"] =
    //                                     helpers::foreign_key_options_extractor(
    //                                         arguments, join_type,
    //                                     );
    //                             } else {
    //                                 println!("no arguments for foreign key.")
    //                             }
    //                             continue;
    //                         }

    //                         if decorator_name == "JoinColumn" {
    //                             if arguments.len() > 0 {
    //                                 column_object = helpers::join_column_options_extractor(
    //                                     column_object,
    //                                     arguments,
    //                                 );
    //                             } else {
    //                                 println!("no arguments for join column.")
    //                             }
    //                             continue;
    //                         }

    //                         if decorator_name == "JoinTable" {
    //                             if arguments.len() > 0 {
    //                                 column_object = helpers::join_table_options_extractor(
    //                                     column_object,
    //                                     arguments,
    //                                 );
    //                             } else {
    //                                 println!("no arguments for join table.")
    //                             }
    //                             continue;
    //                         }

    //                         if decorator_name == "Column" && !is_foreign_key && !is_primary_key {
    //                             // basic column
    //                             if arguments.len() > 0 {
    //                                 column_object = helpers::basic_column_options_extractor(
    //                                     column_object,
    //                                     arguments,
    //                                 );
    //                             } else {
    //                                 println!("no arguments for basic column.")
    //                             }
    //                         }
    //                     }
    //                 }

    //                 column_object["name"] = attribute["key"]["name"].clone();

    //                 let data_type = column_object["dataType"].as_str().unwrap_or("");
    //                 if data_type.len() < 1 {
    //                     column_object["dataType"] = json!(helpers::ts_type_extractor(attribute));
    //                 } else {
    //                     column_object["dataType"] = json!(helpers::ts_type_extractor(attribute));
    //                 }

    //                 table_object["data"]["columns"]
    //                     .as_array_mut()
    //                     .unwrap()
    //                     .push(column_object);
    //             }

    //             tables_vec.push(table_object);
    //         } else {
    //             println!("Skipping... body is of type {}.", node_type);
    //         }
    //     }
    // } else {
    //     println!("empty body.")
    // }

    // let mut tables_iter = tables_vec.clone();

    // let mut table_idx = 0;
    // let mut column_idx = 0;

    // for table in &tables_vec {
    //     let columns = table["data"]["columns"].as_array().unwrap_or(&empty_array);

    //     for column in columns {
    //         if column["foreignKey"] != json!(null) {
    //             if let Some(fk) = column.get("foreignKey").unwrap().as_object() {
    //                 let mut foreign_key = fk.clone();
    //                 // foregin key exists, lets work on it.
    //                 let target_table_name = column["foreignKey"]["target"]["table"]
    //                     .as_str()
    //                     .unwrap_or("")
    //                     .to_string();

    //                 let target_column_name = column["foreignKey"]["target"]["column"]
    //                     .as_str()
    //                     .unwrap_or("")
    //                     .to_string();

    //                 if let Some(target_table) = tables_iter
    //                     .iter()
    //                     .find(|x| x["data"]["name"] == helpers::trim_quotes(&target_table_name))
    //                 {
    //                     let target_table_columns = target_table["data"]["columns"]
    //                         .as_array()
    //                         .unwrap_or(&empty_array);

    //                     if let Some(target_column) = target_table_columns
    //                         .iter()
    //                         .find(|x| x["name"] == helpers::trim_quotes(&target_column_name))
    //                     {
    //                         let target_table_id =
    //                             target_table["id"].as_str().unwrap_or("").to_string();
    //                         let target_column_id =
    //                             target_column["id"].as_str().unwrap_or("").to_string();

    //                         let target = json!({
    //                             "table": target_table_id,
    //                             "tableName": target_table_name,
    //                             "column": target_column_id,
    //                             "columnName": target_column_name
    //                         });

    //                         foreign_key["target"] = target;

    //                         tables_iter[table_idx]["data"]["columns"][column_idx]["foreignKey"] =
    //                             json!(foreign_key);

    //                         tables_iter[table_idx]["data"]["joins"]
    //                             .as_array_mut()
    //                             .unwrap()
    //                             .push(json!(foreign_key))
    //                     } else {
    //                         // target column not found, set to null for now.
    //                         tables_iter[table_idx]["data"]["columns"][column_idx]["foreignKey"] =
    //                             json!(null);
    //                     }
    //                 } else {
    //                     // target table not found, set to null for now.
    //                     tables_iter[table_idx]["data"]["columns"][column_idx]["foreignKey"] =
    //                         json!(null);
    //                 }
    //             }
    //         }
    //         column_idx = column_idx + 1;
    //     }
    //     table_idx = table_idx + 1;
    // }
    // helpers::stringify_json(json!(tables_iter))
}
