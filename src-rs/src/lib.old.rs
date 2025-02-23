/* Deprecated temporarily, see v2 */
// #[wasm_bindgen]
// pub fn convert_from_typeorm(typeorm_code: &str) -> String {
//     let table_id = nanoid!();
//     let mut table_object = json!({
//         "id": table_id,
//         "type": "table",
//         "data": {
//             "id": table_id,
//             "name": "",
//             "dbName": "",
//             "primaryKey": "",
//             "description": "",
//             "timestamps": true,
//             "engine": "InnoDB",
//             "columns": [],
//             "joins": []
//         },
//     });

//     let entity_regex = Regex::new(r"export class (\w+) \{").unwrap();

//     // Regex for column name and type e.g. `name: string;`
//     let column_name_type_regex = Regex::new(r"(\w+): ([\w<>, |]+)").unwrap();

//     // Regex for `@Column` with options
//     let column_with_options_regex = Regex::new(r"@Column\(\s*([^)]*)\s*\)").unwrap();

//     // Regex for `@PrimaryGeneratedColumn` with options
//     let primary_key_with_options_regex =
//         Regex::new(r"@PrimaryGeneratedColumn\(\s*([^)]*)\s*\)").unwrap();

//     // Regexes to extract options from join decorators
//     let target_table_regex = Regex::new(r"\(\s*\)\s*=>\s*(\w+)").unwrap();
//     let target_column_regex = Regex::new(r"\((\w+)\)\s*=>\s*(\w+).(\w+)").unwrap();
//     let join_options_regex = Regex::new(r",\s*\{\s*([^)]*)\s*\}").unwrap();

//     let join_column_with_options_regex = Regex::new(r"@JoinColumn\(\s*([^)]*)\s*\)").unwrap();
//     let join_table_with_options_regex = Regex::new(r"@JoinTable\(\s*([^)]*)\s*\)").unwrap();

//     let lines: Vec<&str> = typeorm_code.lines().collect();

//     let mut found_entity = false;
//     let mut current_foreign_key = json!({
//         "target": null,
//         "onDelete": "RESTRICT",
//         "onUpdate": "RESTRICT",
//         "through": null,
//         "source": null,
//         "type": null
//     });

//     for line in lines {
//         let line = line.trim();

//         if !found_entity {
//             // Check for the single entity class definition
//             if let Some(caps) = entity_regex.captures(line) {
//                 found_entity = true;
//                 let entity_name = caps[1].to_string();
//                 table_object["data"]["name"] = json!(entity_name);
//             }
//             continue;
//         }

//         let mut found_column = false;
//         let mut is_primary = false;

//         let mut column_name = String::new();
//         let mut data_type = String::new();
//         let mut column_options = String::new();

//         let is_index = line.contains("@Index()");

//         // basic column.
//         if line.contains("@Column") {
//             found_column = true;

//             println!("Found a basic column: {}", line);
//             if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
//                 if let Some(content) = caps.get(1) {
//                     column_name = content.as_str().into();
//                 }
//                 if let Some(content) = caps.get(2) {
//                     data_type = content.as_str().into();
//                 }
//             }

//             // Check for options
//             if let Some(caps) = column_with_options_regex.captures(line) {
//                 column_options = caps[1].to_string();
//             }
//         }

//         // primary key.
//         if line.contains("@PrimaryGeneratedColumn") {
//             found_column = true;
//             is_primary = true;

//             println!("Found a primary key: {}", line);
//             if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
//                 if let Some(content) = caps.get(1) {
//                     column_name = content.as_str().into();
//                 }
//                 if let Some(content) = caps.get(2) {
//                     data_type = content.as_str().into();
//                 }
//             }

//             // Check for options
//             if let Some(caps) = primary_key_with_options_regex.captures(line) {
//                 column_options = caps[1].to_string();
//             }
//         }

//         // Extract @OneToOne relationships
//         if line.contains("@OneToOne") {
//             // foreign key.
//             found_column = true;
//             current_foreign_key["type"] = json!("one-to-one");

//             println!("Found a many-to-one key: {}", line);
//             if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
//                 if let Some(content) = caps.get(1) {
//                     column_name = content.as_str().into();
//                 }
//                 if let Some(content) = caps.get(2) {
//                     data_type = content.as_str().into();
//                 }
//             }
//         }

//         // Extract @ManyToOne relationships
//         if line.contains("@ManyToOne") {
//             // foreign key.
//             found_column = true;
//             current_foreign_key["type"] = json!("many-to-one");

//             println!("Found a many-to-one key: {}", line);
//             if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
//                 if let Some(content) = caps.get(1) {
//                     column_name = content.as_str().into();
//                 }
//                 if let Some(content) = caps.get(2) {
//                     data_type = content.as_str().into();
//                 }
//             }
//         }

//         // Extract @OneToMany relationships
//         if line.contains("@OneToMany") {
//             // foreign key.
//             found_column = true;
//             current_foreign_key["type"] = json!("one-to-many");

//             println!("Found a many-to-one key: {}", line);
//             if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
//                 if let Some(content) = caps.get(1) {
//                     column_name = content.as_str().into();
//                 }
//                 if let Some(content) = caps.get(2) {
//                     data_type = content.as_str().into();
//                 }
//             }
//         }

//         // Extract @ManyToMany relationships
//         if line.contains("@ManyToMany") {
//             // foreign key.
//             found_column = true;
//             current_foreign_key["type"] = json!("many-to-many");

//             println!("Found a many-to-one key: {}", line);
//             if let Some(caps) = column_name_type_regex.captures_iter(line).last() {
//                 if let Some(content) = caps.get(1) {
//                     column_name = content.as_str().into();
//                 }
//                 if let Some(content) = caps.get(2) {
//                     data_type = content.as_str().into();
//                 }
//             }
//         }

//         if current_foreign_key["type"] != json!(null) {
//             let mut target_table = "".to_string();
//             let mut target_column = "".to_string();

//             if let Some(caps) = target_table_regex.captures(line) {
//                 target_table = caps[1].to_string()
//             }

//             if let Some(caps) = target_column_regex.captures(line) {
//                 target_column = caps[3].to_string()
//             };

//             current_foreign_key["target"] = json!({
//                 "table": target_table,
//                 "column": target_column
//             });

//             if let Some(caps) = join_options_regex.captures(line) {
//                 let options = "{".to_owned() + caps[1].to_string().as_str() + "}";
//                 let options_json = helpers::parse_json(options.as_str());

//                 if let Some(obj) = options_json.as_object() {
//                     for (key, value) in obj {
//                         match key.as_str() {
//                             "onDelete" => current_foreign_key["onDelete"] = value.clone(),
//                             "onUpdate" => current_foreign_key["onUpdate"] = value.clone(),
//                             _ => {}
//                         }
//                     }
//                 }
//             }
//         }

//         println!(
//             "foreign key options: {}",
//             serde_json::to_string(&current_foreign_key).unwrap()
//         );

//         // Extract columns
//         if found_column {
//             let column_id = nanoid!();
//             let mut column_object = json!({
//                 "id": column_id,
//                 "name": column_name,
//                 "dbName": column_name,
//                 "dataType": data_type,
//                 "primaryKey": is_primary,
//                 "index": is_index,
//                 "unique": false,
//                 "nullable": false,
//                 "defaultValue": null,
//                 "length": 255,
//                 "precision": null,
//                 "scale": null,
//                 "collation": null,
//                 "description": "",
//                 "autoIncrement": false,
//                 "foreignKey": null,
//                 "select": true,
//                 "zerofill": false,
//                 "enum": null,
//                 "enumName": null,
//                 "hstoreType": null,
//                 "array": false
//             });

//             if is_primary {
//                 // column_options is string for data type2_
//                 table_object["data"]["primaryKey"] = json!(column_id);

//                 if column_options.is_empty() {
//                     column_options = "number".to_string();
//                 } else {
//                     column_options = helpers::trim_quotes(&column_options).to_string();
//                 }

//                 if let Some(obj) = column_object.as_object_mut() {
//                     obj.insert("dataType".to_string(), json!(column_options));
//                 } else {
//                     println!("column_object is not an object");
//                 }
//             } else if current_foreign_key["type"] != json!(null) {
//                 // join column props
//                 if line.contains("@JoinColumn") {
//                     if let Some(caps) = join_column_with_options_regex.captures(line) {
//                         column_options = caps[1].to_string();
//                     }
//                     println!("join column options: {}", column_options);
//                     let options_json = helpers::parse_json(column_options.as_str());
//                     if let Some(obj) = options_json.as_object() {
//                         for (key, value) in obj {
//                             match key.as_str() {
//                                 "name" => column_object["dbName"] = value.clone(),
//                                 "referencedColumnName" => {
//                                     current_foreign_key["target"]["column"] = value.clone()
//                                 }
//                                 _ => {}
//                             }
//                         }
//                     }
//                 }

//                 // join table props
//                 if line.contains("@JoinTable") {
//                     if let Some(caps) = join_table_with_options_regex.captures(line) {
//                         column_options = caps[1].to_string();
//                     }
//                     println!("join table options: {}", column_options);
//                     let options_json = helpers::parse_json(column_options.as_str());
//                     if let Some(obj) = options_json.as_object() {
//                         for (key, value) in obj {
//                             match key.as_str() {
//                                 "name" => current_foreign_key["through"] = value.clone(),
//                                 "joinColumn" => {
//                                     current_foreign_key["target"]["column"] =
//                                         value["referencedColumnName"].clone();
//                                     column_object["dbName"] = value["name"].clone()
//                                 }
//                                 "inverseJoinColumn" => {
//                                     current_foreign_key["inverseColumn"]["dbName"] =
//                                         value["name"].clone();
//                                     current_foreign_key["inverseColumn"]["value"] =
//                                         value["referencedColumnName"].clone();
//                                 }
//                                 _ => {}
//                             }
//                         }
//                     }
//                 }

//                 column_object
//                     .as_object_mut()
//                     .unwrap()
//                     .insert("foreignKey".to_string(), json!(current_foreign_key));
//             } else {
//                 // parse basic column options
//                 println!("column options: {}", column_options);
//                 let options_json = helpers::parse_json(column_options.as_str());

//                 if let Some(obj) = options_json.as_object() {
//                     for (key, value) in obj {
//                         match key.as_str() {
//                             "name" => column_object["dbName"] = value.clone(),
//                             "type" => column_object["dataType"] = value.clone(),
//                             "index" => column_object["index"] = value.clone(),
//                             "unique" => column_object["unique"] = value.clone(),
//                             "nullable" => column_object["nullable"] = value.clone(),
//                             "default" => column_object["defaultValue"] = value.clone(),
//                             "length" => column_object["length"] = value.clone(),
//                             "precision" => column_object["precision"] = value.clone(),
//                             "scale" => column_object["scale"] = value.clone(),
//                             "collation" => column_object["collation"] = value.clone(),
//                             "autoIncrement" => column_object["autoIncrement"] = value.clone(),
//                             "select" => column_object["select"] = value.clone(),
//                             "zerofill" => column_object["zerofill"] = value.clone(),
//                             "enum" => {
//                                 column_object["enum"] = value
//                                     .clone()
//                                     .to_string()
//                                     .split(",")
//                                     .map(|s| Value::String(s.to_string())) // Convert each item to Value::String
//                                     .collect()
//                             }
//                             "enumName" => column_object["enumName"] = value.clone(),
//                             "hstoreType" => column_object["hstoreType"] = value.clone(),
//                             "array" => column_object["array"] = value.clone(),
//                             _ => {}
//                         }
//                     }
//                 }
//             }

//             // Add the column object to the table's columns array
//             table_object["data"]["columns"]
//                 .as_array_mut()
//                 .unwrap()
//                 .push(column_object);
//         }

//         // Add the foreign key object to the joins array when complete
//         if current_foreign_key["type"] != json!(null) {
//             table_object["data"]["joins"]
//                 .as_array_mut()
//                 .unwrap()
//                 .push(current_foreign_key.clone());

//             // Reset the foreign key object for the next relationship
//             current_foreign_key = json!({
//                 "target": null,
//                 "onDelete": "RESTRICT",
//                 "onUpdate": "RESTRICT",
//                 "through": null,
//                 "source": null,
//                 "type": null
//             });
//         }

//         println!("--------");
//     }

//     // Return the table object as a JSON string
//     serde_json::to_string(&table_object).unwrap()
// }
