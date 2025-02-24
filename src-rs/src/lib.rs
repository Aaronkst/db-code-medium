mod helpers;

use serde_json::{json, Value};
use wasm_bindgen::prelude::*;

/**
Convert nodes to typeORM syntax.
*/
#[wasm_bindgen]
pub fn convert_to_typeorm(json_str: &str) -> String {
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
                        // Generate the column definition
                        entity_code.push_str(&format!(
                            "    {}\n    {}: {};\n\n",
                            column_decorator, column_name, ts_data_type
                        ));
                    } else if is_auto_increment {
                        column_decorator = "@PrimaryGeneratedColumn(\"increment\")".to_string();

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
    }
    let joined_entities = entity_codes.join("\n");
    joined_entities
}

/**
Convert parsed typORM syntax to nodes.
*/
#[wasm_bindgen]
pub fn convert_from_typeorm_v2(program: &str) -> String {
    let data = helpers::parse_json(program);

    let mut tables_vec: Vec<Value> = Vec::new();
    let empty_array = Vec::new();

    let body_array = data["body"].as_array().unwrap_or(&empty_array);

    if body_array.len() > 0 {
        for node in body_array {
            let node_type = node["type"].as_str().unwrap_or("").to_string();

            if node_type == "ClassDeclaration".to_string() {
                // Initialize a default table.
                let mut table_object = helpers::get_default_table();

                let table_name = node["id"]["name"].as_str().unwrap_or("").to_string();
                table_object["data"]["name"] = json!(table_name);

                let attributes = node["body"]["body"].as_array().unwrap_or(&empty_array);

                for attribute in attributes {
                    let mut column_object = helpers::get_default_column();

                    if let Some(decorators) = attribute.get("decorators").unwrap().as_array() {
                        let is_primary_key = column_object["primaryKey"].as_bool().unwrap_or(false);
                        let is_foreign_key = column_object["foreignKey"] != json!(null);

                        for decorator in decorators {
                            let decorator_name = decorator["expression"]["callee"]["name"]
                                .as_str()
                                .unwrap_or("")
                                .to_string();

                            let arguments = decorator["expression"]["arguments"]
                                .as_array()
                                .unwrap_or(&empty_array);

                            if decorator_name == "Index" {
                                column_object["index"] = json!(true);
                                continue;
                            }

                            if decorator_name == "PrimaryGeneratedColumn" && !is_foreign_key {
                                // primary column
                                column_object["primaryKey"] = json!(true);

                                if arguments.len() > 0 {
                                    let argument_type =
                                        arguments[0]["type"].as_str().unwrap_or("").to_string();
                                    if argument_type == "Literal" {
                                        column_object["dataType"] =
                                            json!(arguments[0]["value"].as_str().unwrap_or(""));
                                    }
                                } else {
                                    println!("no arguments for primary key.")
                                }
                                continue;
                            }

                            let mut join_type = "";
                            match decorator_name.as_str() {
                                "OneToOne" => join_type = "one-to-one",
                                "ManyToOne" => join_type = "many-to-one",
                                "OneToMany" => join_type = "one-to-many",
                                "ManyToMany" => join_type = "many-to-many",
                                _ => {}
                            }

                            if join_type.len() > 0 && !is_primary_key {
                                if arguments.len() > 0 {
                                    column_object["foreignKey"] =
                                        helpers::foreign_key_options_extractor(
                                            arguments, join_type,
                                        );
                                } else {
                                    println!("no arguments for foreign key.")
                                }
                                continue;
                            }

                            if decorator_name == "JoinColumn" {
                                if arguments.len() > 0 {
                                    column_object = helpers::join_column_options_extractor(
                                        column_object,
                                        arguments,
                                    );
                                } else {
                                    println!("no arguments for join column.")
                                }
                                continue;
                            }

                            if decorator_name == "JoinTable" {
                                if arguments.len() > 0 {
                                    column_object = helpers::join_table_options_extractor(
                                        column_object,
                                        arguments,
                                    );
                                } else {
                                    println!("no arguments for join table.")
                                }
                                continue;
                            }

                            if decorator_name == "Column" && !is_foreign_key && !is_primary_key {
                                // basic column
                                if arguments.len() > 0 {
                                    column_object = helpers::basic_column_options_extractor(
                                        column_object,
                                        arguments,
                                    );
                                } else {
                                    println!("no arguments for basic column.")
                                }
                            }
                        }
                    }

                    column_object["name"] = attribute["key"]["name"].clone();

                    let data_type = column_object["dataType"].as_str().unwrap_or("");
                    if data_type.len() < 1 {
                        column_object["dataType"] = json!(helpers::ts_type_extractor(attribute));
                    } else {
                        column_object["dataType"] = json!(helpers::ts_type_extractor(attribute));
                    }

                    table_object["data"]["columns"]
                        .as_array_mut()
                        .unwrap()
                        .push(column_object);
                }

                tables_vec.push(table_object);
            } else {
                println!("Skipping... body is of type {}.", node_type);
            }
        }
    } else {
        println!("empty body.")
    }

    let mut tables_iter = tables_vec.clone();

    let mut table_idx = 0;
    let mut column_idx = 0;

    for table in &tables_vec {
        let columns = table["data"]["columns"].as_array().unwrap_or(&empty_array);

        for column in columns {
            if column["foreignKey"] != json!(null) {
                if let Some(fk) = column.get("foreignKey").unwrap().as_object() {
                    let mut foreign_key = fk.clone();
                    // foregin key exists, lets work on it.
                    let target_table_name = column["foreignKey"]["target"]["table"]
                        .as_str()
                        .unwrap_or("")
                        .to_string();

                    let target_column_name = column["foreignKey"]["target"]["column"]
                        .as_str()
                        .unwrap_or("")
                        .to_string();

                    if let Some(target_table) = tables_iter
                        .iter()
                        .find(|x| x["data"]["name"] == helpers::trim_quotes(&target_table_name))
                    {
                        let target_table_columns = target_table["data"]["columns"]
                            .as_array()
                            .unwrap_or(&empty_array);

                        if let Some(target_column) = target_table_columns
                            .iter()
                            .find(|x| x["name"] == helpers::trim_quotes(&target_column_name))
                        {
                            let target_table_id =
                                target_table["id"].as_str().unwrap_or("").to_string();
                            let target_column_id =
                                target_column["id"].as_str().unwrap_or("").to_string();

                            let target = json!({
                                "table": target_table_id,
                                "tableName": target_table_name,
                                "column": target_column_id,
                                "columnName": target_column_name
                            });

                            foreign_key["target"] = target;

                            tables_iter[table_idx]["data"]["columns"][column_idx]["foreignKey"] =
                                json!(foreign_key);

                            tables_iter[table_idx]["data"]["joins"]
                                .as_array_mut()
                                .unwrap()
                                .push(json!(foreign_key))
                        } else {
                            // target column not found, set to null for now.
                            tables_iter[table_idx]["data"]["columns"][column_idx]["foreignKey"] =
                                json!(null);
                        }
                    } else {
                        // target table not found, set to null for now.
                        tables_iter[table_idx]["data"]["columns"][column_idx]["foreignKey"] =
                            json!(null);
                    }
                }
            }
            column_idx = column_idx + 1;
        }
        table_idx = table_idx + 1;
    }
    helpers::stringify_json(json!(tables_iter))
}

fn main() {
    println!("\nRunning rust library ⚙️\n");

    let payload = r#"
        {"type":"Program","range":[0,472],"body":[{"type":"ClassDeclaration","abstract":false,"body":{"type":"ClassBody","range":[15,303],"body":[{"type":"PropertyDefinition","computed":false,"declare":false,"decorators":[{"type":"Decorator","expression":{"type":"CallExpression","arguments":[{"type":"Literal","raw":"\"uuid\"","value":"uuid","range":[43,49],"loc":{"end":{"column":32,"line":2},"start":{"column":26,"line":2}}}],"callee":{"type":"Identifier","decorators":[],"name":"PrimaryGeneratedColumn","optional":false,"range":[20,42],"loc":{"end":{"column":25,"line":2},"start":{"column":3,"line":2}}},"optional":false,"range":[20,50],"loc":{"end":{"column":33,"line":2},"start":{"column":3,"line":2}}},"range":[19,50],"loc":{"end":{"column":33,"line":2},"start":{"column":2,"line":2}}}],"definite":false,"key":{"type":"Identifier","decorators":[],"name":"id","optional":false,"range":[53,55],"loc":{"end":{"column":4,"line":3},"start":{"column":2,"line":3}}},"optional":false,"override":false,"readonly":false,"static":false,"typeAnnotation":{"type":"TSTypeAnnotation","loc":{"end":{"column":12,"line":3},"start":{"column":4,"line":3}},"range":[55,63],"typeAnnotation":{"type":"TSStringKeyword","range":[57,63],"loc":{"end":{"column":12,"line":3},"start":{"column":6,"line":3}}}},"value":null,"range":[19,64],"loc":{"end":{"column":13,"line":3},"start":{"column":2,"line":2}}},{"type":"PropertyDefinition","computed":false,"declare":false,"decorators":[{"type":"Decorator","expression":{"type":"CallExpression","arguments":[{"type":"ObjectExpression","properties":[{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"name","optional":false,"range":[78,82],"loc":{"end":{"column":16,"line":5},"start":{"column":12,"line":5}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"\"name\"","value":"name","range":[84,90],"loc":{"end":{"column":24,"line":5},"start":{"column":18,"line":5}}},"range":[78,90],"loc":{"end":{"column":24,"line":5},"start":{"column":12,"line":5}}},{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"length","optional":false,"range":[92,98],"loc":{"end":{"column":32,"line":5},"start":{"column":26,"line":5}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"255","value":255,"range":[100,103],"loc":{"end":{"column":37,"line":5},"start":{"column":34,"line":5}}},"range":[92,103],"loc":{"end":{"column":37,"line":5},"start":{"column":26,"line":5}}},{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"nullable","optional":false,"range":[105,113],"loc":{"end":{"column":47,"line":5},"start":{"column":39,"line":5}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"false","value":false,"range":[115,120],"loc":{"end":{"column":54,"line":5},"start":{"column":49,"line":5}}},"range":[105,120],"loc":{"end":{"column":54,"line":5},"start":{"column":39,"line":5}}},{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"unique","optional":false,"range":[122,128],"loc":{"end":{"column":62,"line":5},"start":{"column":56,"line":5}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"true","value":true,"range":[130,134],"loc":{"end":{"column":68,"line":5},"start":{"column":64,"line":5}}},"range":[122,134],"loc":{"end":{"column":68,"line":5},"start":{"column":56,"line":5}}}],"range":[76,136],"loc":{"end":{"column":70,"line":5},"start":{"column":10,"line":5}}}],"callee":{"type":"Identifier","decorators":[],"name":"Column","optional":false,"range":[69,75],"loc":{"end":{"column":9,"line":5},"start":{"column":3,"line":5}}},"optional":false,"range":[69,137],"loc":{"end":{"column":71,"line":5},"start":{"column":3,"line":5}}},"range":[68,137],"loc":{"end":{"column":71,"line":5},"start":{"column":2,"line":5}}},{"type":"Decorator","expression":{"type":"CallExpression","arguments":[],"callee":{"type":"Identifier","decorators":[],"name":"Index","optional":false,"range":[141,146],"loc":{"end":{"column":8,"line":6},"start":{"column":3,"line":6}}},"optional":false,"range":[141,148],"loc":{"end":{"column":10,"line":6},"start":{"column":3,"line":6}}},"range":[140,148],"loc":{"end":{"column":10,"line":6},"start":{"column":2,"line":6}}}],"definite":false,"key":{"type":"Identifier","decorators":[],"name":"name","optional":false,"range":[151,155],"loc":{"end":{"column":6,"line":7},"start":{"column":2,"line":7}}},"optional":false,"override":false,"readonly":false,"static":false,"typeAnnotation":{"type":"TSTypeAnnotation","loc":{"end":{"column":14,"line":7},"start":{"column":6,"line":7}},"range":[155,163],"typeAnnotation":{"type":"TSStringKeyword","range":[157,163],"loc":{"end":{"column":14,"line":7},"start":{"column":8,"line":7}}}},"value":null,"range":[68,164],"loc":{"end":{"column":15,"line":7},"start":{"column":2,"line":5}}},{"type":"PropertyDefinition","computed":false,"declare":false,"decorators":[{"type":"Decorator","expression":{"type":"CallExpression","arguments":[{"type":"ArrowFunctionExpression","async":false,"body":{"type":"Identifier","decorators":[],"name":"Contact","optional":false,"range":[185,192],"loc":{"end":{"column":26,"line":9},"start":{"column":19,"line":9}}},"expression":true,"generator":false,"id":null,"params":[],"range":[179,192],"loc":{"end":{"column":26,"line":9},"start":{"column":13,"line":9}}},{"type":"ArrowFunctionExpression","async":false,"body":{"type":"MemberExpression","computed":false,"object":{"type":"Identifier","decorators":[],"name":"contact","optional":false,"range":[207,214],"loc":{"end":{"column":48,"line":9},"start":{"column":41,"line":9}}},"optional":false,"property":{"type":"Identifier","decorators":[],"name":"id","optional":false,"range":[215,217],"loc":{"end":{"column":51,"line":9},"start":{"column":49,"line":9}}},"range":[207,217],"loc":{"end":{"column":51,"line":9},"start":{"column":41,"line":9}}},"expression":true,"generator":false,"id":null,"params":[{"type":"Identifier","decorators":[],"name":"contact","optional":false,"range":[195,202],"loc":{"end":{"column":36,"line":9},"start":{"column":29,"line":9}}}],"range":[194,217],"loc":{"end":{"column":51,"line":9},"start":{"column":28,"line":9}}},{"type":"ObjectExpression","properties":[{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"onDelete","optional":false,"range":[221,229],"loc":{"end":{"column":63,"line":9},"start":{"column":55,"line":9}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"\"SET NULL\"","value":"SET NULL","range":[231,241],"loc":{"end":{"column":75,"line":9},"start":{"column":65,"line":9}}},"range":[221,241],"loc":{"end":{"column":75,"line":9},"start":{"column":55,"line":9}}}],"range":[219,243],"loc":{"end":{"column":77,"line":9},"start":{"column":53,"line":9}}}],"callee":{"type":"Identifier","decorators":[],"name":"OneToMany","optional":false,"range":[169,178],"loc":{"end":{"column":12,"line":9},"start":{"column":3,"line":9}}},"optional":false,"range":[169,244],"loc":{"end":{"column":78,"line":9},"start":{"column":3,"line":9}}},"range":[168,244],"loc":{"end":{"column":78,"line":9},"start":{"column":2,"line":9}}},{"type":"Decorator","expression":{"type":"CallExpression","arguments":[{"type":"ObjectExpression","properties":[{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"name","optional":false,"range":[261,265],"loc":{"end":{"column":20,"line":10},"start":{"column":16,"line":10}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"\"contact_id\"","value":"contact_id","range":[267,279],"loc":{"end":{"column":34,"line":10},"start":{"column":22,"line":10}}},"range":[261,279],"loc":{"end":{"column":34,"line":10},"start":{"column":16,"line":10}}}],"range":[259,281],"loc":{"end":{"column":36,"line":10},"start":{"column":14,"line":10}}}],"callee":{"type":"Identifier","decorators":[],"name":"JoinColumn","optional":false,"range":[248,258],"loc":{"end":{"column":13,"line":10},"start":{"column":3,"line":10}}},"optional":false,"range":[248,282],"loc":{"end":{"column":37,"line":10},"start":{"column":3,"line":10}}},"range":[247,282],"loc":{"end":{"column":37,"line":10},"start":{"column":2,"line":10}}}],"definite":false,"key":{"type":"Identifier","decorators":[],"name":"contact","optional":false,"range":[285,292],"loc":{"end":{"column":9,"line":11},"start":{"column":2,"line":11}}},"optional":false,"override":false,"readonly":false,"static":false,"typeAnnotation":{"type":"TSTypeAnnotation","loc":{"end":{"column":18,"line":11},"start":{"column":9,"line":11}},"range":[292,301],"typeAnnotation":{"type":"TSTypeReference","typeName":{"type":"Identifier","decorators":[],"name":"Contact","optional":false,"range":[294,301],"loc":{"end":{"column":18,"line":11},"start":{"column":11,"line":11}}},"range":[294,301],"loc":{"end":{"column":18,"line":11},"start":{"column":11,"line":11}}}},"value":null,"range":[168,301],"loc":{"end":{"column":18,"line":11},"start":{"column":2,"line":9}}}],"loc":{"end":{"column":1,"line":12},"start":{"column":15,"line":1}}},"declare":false,"decorators":[],"id":{"type":"Identifier","decorators":[],"name":"Customer","optional":false,"range":[6,14],"loc":{"end":{"column":14,"line":1},"start":{"column":6,"line":1}}},"implements":[],"superClass":null,"range":[0,303],"loc":{"end":{"column":1,"line":12},"start":{"column":0,"line":1}}},{"type":"ClassDeclaration","abstract":false,"body":{"type":"ClassBody","range":[319,472],"body":[{"type":"PropertyDefinition","computed":false,"declare":false,"decorators":[{"type":"Decorator","expression":{"type":"CallExpression","arguments":[{"type":"Literal","raw":"\"uuid\"","value":"uuid","range":[347,353],"loc":{"end":{"column":32,"line":15},"start":{"column":26,"line":15}}}],"callee":{"type":"Identifier","decorators":[],"name":"PrimaryGeneratedColumn","optional":false,"range":[324,346],"loc":{"end":{"column":25,"line":15},"start":{"column":3,"line":15}}},"optional":false,"range":[324,354],"loc":{"end":{"column":33,"line":15},"start":{"column":3,"line":15}}},"range":[323,354],"loc":{"end":{"column":33,"line":15},"start":{"column":2,"line":15}}}],"definite":false,"key":{"type":"Identifier","decorators":[],"name":"id","optional":false,"range":[357,359],"loc":{"end":{"column":4,"line":16},"start":{"column":2,"line":16}}},"optional":false,"override":false,"readonly":false,"static":false,"typeAnnotation":{"type":"TSTypeAnnotation","loc":{"end":{"column":12,"line":16},"start":{"column":4,"line":16}},"range":[359,367],"typeAnnotation":{"type":"TSStringKeyword","range":[361,367],"loc":{"end":{"column":12,"line":16},"start":{"column":6,"line":16}}}},"value":null,"range":[323,368],"loc":{"end":{"column":13,"line":16},"start":{"column":2,"line":15}}},{"type":"PropertyDefinition","computed":false,"declare":false,"decorators":[{"type":"Decorator","expression":{"type":"CallExpression","arguments":[{"type":"ObjectExpression","properties":[{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"name","optional":false,"range":[382,386],"loc":{"end":{"column":16,"line":18},"start":{"column":12,"line":18}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"\"phone\"","value":"phone","range":[388,395],"loc":{"end":{"column":25,"line":18},"start":{"column":18,"line":18}}},"range":[382,395],"loc":{"end":{"column":25,"line":18},"start":{"column":12,"line":18}}},{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"length","optional":false,"range":[397,403],"loc":{"end":{"column":33,"line":18},"start":{"column":27,"line":18}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"255","value":255,"range":[405,408],"loc":{"end":{"column":38,"line":18},"start":{"column":35,"line":18}}},"range":[397,408],"loc":{"end":{"column":38,"line":18},"start":{"column":27,"line":18}}},{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"nullable","optional":false,"range":[410,418],"loc":{"end":{"column":48,"line":18},"start":{"column":40,"line":18}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"false","value":false,"range":[420,425],"loc":{"end":{"column":55,"line":18},"start":{"column":50,"line":18}}},"range":[410,425],"loc":{"end":{"column":55,"line":18},"start":{"column":40,"line":18}}},{"type":"Property","computed":false,"key":{"type":"Identifier","decorators":[],"name":"unique","optional":false,"range":[427,433],"loc":{"end":{"column":63,"line":18},"start":{"column":57,"line":18}}},"kind":"init","method":false,"optional":false,"shorthand":false,"value":{"type":"Literal","raw":"true","value":true,"range":[435,439],"loc":{"end":{"column":69,"line":18},"start":{"column":65,"line":18}}},"range":[427,439],"loc":{"end":{"column":69,"line":18},"start":{"column":57,"line":18}}}],"range":[380,441],"loc":{"end":{"column":71,"line":18},"start":{"column":10,"line":18}}}],"callee":{"type":"Identifier","decorators":[],"name":"Column","optional":false,"range":[373,379],"loc":{"end":{"column":9,"line":18},"start":{"column":3,"line":18}}},"optional":false,"range":[373,442],"loc":{"end":{"column":72,"line":18},"start":{"column":3,"line":18}}},"range":[372,442],"loc":{"end":{"column":72,"line":18},"start":{"column":2,"line":18}}},{"type":"Decorator","expression":{"type":"CallExpression","arguments":[],"callee":{"type":"Identifier","decorators":[],"name":"Index","optional":false,"range":[446,451],"loc":{"end":{"column":8,"line":19},"start":{"column":3,"line":19}}},"optional":false,"range":[446,453],"loc":{"end":{"column":10,"line":19},"start":{"column":3,"line":19}}},"range":[445,453],"loc":{"end":{"column":10,"line":19},"start":{"column":2,"line":19}}}],"definite":false,"key":{"type":"Identifier","decorators":[],"name":"phone","optional":false,"range":[456,461],"loc":{"end":{"column":7,"line":20},"start":{"column":2,"line":20}}},"optional":false,"override":false,"readonly":false,"static":false,"typeAnnotation":{"type":"TSTypeAnnotation","loc":{"end":{"column":15,"line":20},"start":{"column":7,"line":20}},"range":[461,469],"typeAnnotation":{"type":"TSStringKeyword","range":[463,469],"loc":{"end":{"column":15,"line":20},"start":{"column":9,"line":20}}}},"value":null,"range":[372,470],"loc":{"end":{"column":16,"line":20},"start":{"column":2,"line":18}}}],"loc":{"end":{"column":1,"line":21},"start":{"column":14,"line":14}}},"declare":false,"decorators":[],"id":{"type":"Identifier","decorators":[],"name":"Contact","optional":false,"range":[311,318],"loc":{"end":{"column":13,"line":14},"start":{"column":6,"line":14}}},"implements":[],"superClass":null,"range":[305,472],"loc":{"end":{"column":1,"line":21},"start":{"column":0,"line":14}}}],"comments":[],"sourceType":"script","tokens":[{"type":"Keyword","loc":{"end":{"column":5,"line":1},"start":{"column":0,"line":1}},"range":[0,5],"value":"class"},{"type":"Identifier","loc":{"end":{"column":14,"line":1},"start":{"column":6,"line":1}},"range":[6,14],"value":"Customer"},{"type":"Punctuator","loc":{"end":{"column":16,"line":1},"start":{"column":15,"line":1}},"range":[15,16],"value":"{"},{"type":"Punctuator","loc":{"end":{"column":3,"line":2},"start":{"column":2,"line":2}},"range":[19,20],"value":"@"},{"type":"Identifier","loc":{"end":{"column":25,"line":2},"start":{"column":3,"line":2}},"range":[20,42],"value":"PrimaryGeneratedColumn"},{"type":"Punctuator","loc":{"end":{"column":26,"line":2},"start":{"column":25,"line":2}},"range":[42,43],"value":"("},{"type":"String","loc":{"end":{"column":32,"line":2},"start":{"column":26,"line":2}},"range":[43,49],"value":"\"uuid\""},{"type":"Punctuator","loc":{"end":{"column":33,"line":2},"start":{"column":32,"line":2}},"range":[49,50],"value":")"},{"type":"Identifier","loc":{"end":{"column":4,"line":3},"start":{"column":2,"line":3}},"range":[53,55],"value":"id"},{"type":"Punctuator","loc":{"end":{"column":5,"line":3},"start":{"column":4,"line":3}},"range":[55,56],"value":":"},{"type":"Identifier","loc":{"end":{"column":12,"line":3},"start":{"column":6,"line":3}},"range":[57,63],"value":"string"},{"type":"Punctuator","loc":{"end":{"column":13,"line":3},"start":{"column":12,"line":3}},"range":[63,64],"value":";"},{"type":"Punctuator","loc":{"end":{"column":3,"line":5},"start":{"column":2,"line":5}},"range":[68,69],"value":"@"},{"type":"Identifier","loc":{"end":{"column":9,"line":5},"start":{"column":3,"line":5}},"range":[69,75],"value":"Column"},{"type":"Punctuator","loc":{"end":{"column":10,"line":5},"start":{"column":9,"line":5}},"range":[75,76],"value":"("},{"type":"Punctuator","loc":{"end":{"column":11,"line":5},"start":{"column":10,"line":5}},"range":[76,77],"value":"{"},{"type":"Identifier","loc":{"end":{"column":16,"line":5},"start":{"column":12,"line":5}},"range":[78,82],"value":"name"},{"type":"Punctuator","loc":{"end":{"column":17,"line":5},"start":{"column":16,"line":5}},"range":[82,83],"value":":"},{"type":"String","loc":{"end":{"column":24,"line":5},"start":{"column":18,"line":5}},"range":[84,90],"value":"\"name\""},{"type":"Punctuator","loc":{"end":{"column":25,"line":5},"start":{"column":24,"line":5}},"range":[90,91],"value":","},{"type":"Identifier","loc":{"end":{"column":32,"line":5},"start":{"column":26,"line":5}},"range":[92,98],"value":"length"},{"type":"Punctuator","loc":{"end":{"column":33,"line":5},"start":{"column":32,"line":5}},"range":[98,99],"value":":"},{"type":"Numeric","loc":{"end":{"column":37,"line":5},"start":{"column":34,"line":5}},"range":[100,103],"value":"255"},{"type":"Punctuator","loc":{"end":{"column":38,"line":5},"start":{"column":37,"line":5}},"range":[103,104],"value":","},{"type":"Identifier","loc":{"end":{"column":47,"line":5},"start":{"column":39,"line":5}},"range":[105,113],"value":"nullable"},{"type":"Punctuator","loc":{"end":{"column":48,"line":5},"start":{"column":47,"line":5}},"range":[113,114],"value":":"},{"type":"Boolean","loc":{"end":{"column":54,"line":5},"start":{"column":49,"line":5}},"range":[115,120],"value":"false"},{"type":"Punctuator","loc":{"end":{"column":55,"line":5},"start":{"column":54,"line":5}},"range":[120,121],"value":","},{"type":"Identifier","loc":{"end":{"column":62,"line":5},"start":{"column":56,"line":5}},"range":[122,128],"value":"unique"},{"type":"Punctuator","loc":{"end":{"column":63,"line":5},"start":{"column":62,"line":5}},"range":[128,129],"value":":"},{"type":"Boolean","loc":{"end":{"column":68,"line":5},"start":{"column":64,"line":5}},"range":[130,134],"value":"true"},{"type":"Punctuator","loc":{"end":{"column":70,"line":5},"start":{"column":69,"line":5}},"range":[135,136],"value":"}"},{"type":"Punctuator","loc":{"end":{"column":71,"line":5},"start":{"column":70,"line":5}},"range":[136,137],"value":")"},{"type":"Punctuator","loc":{"end":{"column":3,"line":6},"start":{"column":2,"line":6}},"range":[140,141],"value":"@"},{"type":"Identifier","loc":{"end":{"column":8,"line":6},"start":{"column":3,"line":6}},"range":[141,146],"value":"Index"},{"type":"Punctuator","loc":{"end":{"column":9,"line":6},"start":{"column":8,"line":6}},"range":[146,147],"value":"("},{"type":"Punctuator","loc":{"end":{"column":10,"line":6},"start":{"column":9,"line":6}},"range":[147,148],"value":")"},{"type":"Identifier","loc":{"end":{"column":6,"line":7},"start":{"column":2,"line":7}},"range":[151,155],"value":"name"},{"type":"Punctuator","loc":{"end":{"column":7,"line":7},"start":{"column":6,"line":7}},"range":[155,156],"value":":"},{"type":"Identifier","loc":{"end":{"column":14,"line":7},"start":{"column":8,"line":7}},"range":[157,163],"value":"string"},{"type":"Punctuator","loc":{"end":{"column":15,"line":7},"start":{"column":14,"line":7}},"range":[163,164],"value":";"},{"type":"Punctuator","loc":{"end":{"column":3,"line":9},"start":{"column":2,"line":9}},"range":[168,169],"value":"@"},{"type":"Identifier","loc":{"end":{"column":12,"line":9},"start":{"column":3,"line":9}},"range":[169,178],"value":"OneToMany"},{"type":"Punctuator","loc":{"end":{"column":13,"line":9},"start":{"column":12,"line":9}},"range":[178,179],"value":"("},{"type":"Punctuator","loc":{"end":{"column":14,"line":9},"start":{"column":13,"line":9}},"range":[179,180],"value":"("},{"type":"Punctuator","loc":{"end":{"column":15,"line":9},"start":{"column":14,"line":9}},"range":[180,181],"value":")"},{"type":"Punctuator","loc":{"end":{"column":18,"line":9},"start":{"column":16,"line":9}},"range":[182,184],"value":"=>"},{"type":"Identifier","loc":{"end":{"column":26,"line":9},"start":{"column":19,"line":9}},"range":[185,192],"value":"Contact"},{"type":"Punctuator","loc":{"end":{"column":27,"line":9},"start":{"column":26,"line":9}},"range":[192,193],"value":","},{"type":"Punctuator","loc":{"end":{"column":29,"line":9},"start":{"column":28,"line":9}},"range":[194,195],"value":"("},{"type":"Identifier","loc":{"end":{"column":36,"line":9},"start":{"column":29,"line":9}},"range":[195,202],"value":"contact"},{"type":"Punctuator","loc":{"end":{"column":37,"line":9},"start":{"column":36,"line":9}},"range":[202,203],"value":")"},{"type":"Punctuator","loc":{"end":{"column":40,"line":9},"start":{"column":38,"line":9}},"range":[204,206],"value":"=>"},{"type":"Identifier","loc":{"end":{"column":48,"line":9},"start":{"column":41,"line":9}},"range":[207,214],"value":"contact"},{"type":"Punctuator","loc":{"end":{"column":49,"line":9},"start":{"column":48,"line":9}},"range":[214,215],"value":"."},{"type":"Identifier","loc":{"end":{"column":51,"line":9},"start":{"column":49,"line":9}},"range":[215,217],"value":"id"},{"type":"Punctuator","loc":{"end":{"column":52,"line":9},"start":{"column":51,"line":9}},"range":[217,218],"value":","},{"type":"Punctuator","loc":{"end":{"column":54,"line":9},"start":{"column":53,"line":9}},"range":[219,220],"value":"{"},{"type":"Identifier","loc":{"end":{"column":63,"line":9},"start":{"column":55,"line":9}},"range":[221,229],"value":"onDelete"},{"type":"Punctuator","loc":{"end":{"column":64,"line":9},"start":{"column":63,"line":9}},"range":[229,230],"value":":"},{"type":"String","loc":{"end":{"column":75,"line":9},"start":{"column":65,"line":9}},"range":[231,241],"value":"\"SET NULL\""},{"type":"Punctuator","loc":{"end":{"column":77,"line":9},"start":{"column":76,"line":9}},"range":[242,243],"value":"}"},{"type":"Punctuator","loc":{"end":{"column":78,"line":9},"start":{"column":77,"line":9}},"range":[243,244],"value":")"},{"type":"Punctuator","loc":{"end":{"column":3,"line":10},"start":{"column":2,"line":10}},"range":[247,248],"value":"@"},{"type":"Identifier","loc":{"end":{"column":13,"line":10},"start":{"column":3,"line":10}},"range":[248,258],"value":"JoinColumn"},{"type":"Punctuator","loc":{"end":{"column":14,"line":10},"start":{"column":13,"line":10}},"range":[258,259],"value":"("},{"type":"Punctuator","loc":{"end":{"column":15,"line":10},"start":{"column":14,"line":10}},"range":[259,260],"value":"{"},{"type":"Identifier","loc":{"end":{"column":20,"line":10},"start":{"column":16,"line":10}},"range":[261,265],"value":"name"},{"type":"Punctuator","loc":{"end":{"column":21,"line":10},"start":{"column":20,"line":10}},"range":[265,266],"value":":"},{"type":"String","loc":{"end":{"column":34,"line":10},"start":{"column":22,"line":10}},"range":[267,279],"value":"\"contact_id\""},{"type":"Punctuator","loc":{"end":{"column":36,"line":10},"start":{"column":35,"line":10}},"range":[280,281],"value":"}"},{"type":"Punctuator","loc":{"end":{"column":37,"line":10},"start":{"column":36,"line":10}},"range":[281,282],"value":")"},{"type":"Identifier","loc":{"end":{"column":9,"line":11},"start":{"column":2,"line":11}},"range":[285,292],"value":"contact"},{"type":"Punctuator","loc":{"end":{"column":10,"line":11},"start":{"column":9,"line":11}},"range":[292,293],"value":":"},{"type":"Identifier","loc":{"end":{"column":18,"line":11},"start":{"column":11,"line":11}},"range":[294,301],"value":"Contact"},{"type":"Punctuator","loc":{"end":{"column":1,"line":12},"start":{"column":0,"line":12}},"range":[302,303],"value":"}"},{"type":"Keyword","loc":{"end":{"column":5,"line":14},"start":{"column":0,"line":14}},"range":[305,310],"value":"class"},{"type":"Identifier","loc":{"end":{"column":13,"line":14},"start":{"column":6,"line":14}},"range":[311,318],"value":"Contact"},{"type":"Punctuator","loc":{"end":{"column":15,"line":14},"start":{"column":14,"line":14}},"range":[319,320],"value":"{"},{"type":"Punctuator","loc":{"end":{"column":3,"line":15},"start":{"column":2,"line":15}},"range":[323,324],"value":"@"},{"type":"Identifier","loc":{"end":{"column":25,"line":15},"start":{"column":3,"line":15}},"range":[324,346],"value":"PrimaryGeneratedColumn"},{"type":"Punctuator","loc":{"end":{"column":26,"line":15},"start":{"column":25,"line":15}},"range":[346,347],"value":"("},{"type":"String","loc":{"end":{"column":32,"line":15},"start":{"column":26,"line":15}},"range":[347,353],"value":"\"uuid\""},{"type":"Punctuator","loc":{"end":{"column":33,"line":15},"start":{"column":32,"line":15}},"range":[353,354],"value":")"},{"type":"Identifier","loc":{"end":{"column":4,"line":16},"start":{"column":2,"line":16}},"range":[357,359],"value":"id"},{"type":"Punctuator","loc":{"end":{"column":5,"line":16},"start":{"column":4,"line":16}},"range":[359,360],"value":":"},{"type":"Identifier","loc":{"end":{"column":12,"line":16},"start":{"column":6,"line":16}},"range":[361,367],"value":"string"},{"type":"Punctuator","loc":{"end":{"column":13,"line":16},"start":{"column":12,"line":16}},"range":[367,368],"value":";"},{"type":"Punctuator","loc":{"end":{"column":3,"line":18},"start":{"column":2,"line":18}},"range":[372,373],"value":"@"},{"type":"Identifier","loc":{"end":{"column":9,"line":18},"start":{"column":3,"line":18}},"range":[373,379],"value":"Column"},{"type":"Punctuator","loc":{"end":{"column":10,"line":18},"start":{"column":9,"line":18}},"range":[379,380],"value":"("},{"type":"Punctuator","loc":{"end":{"column":11,"line":18},"start":{"column":10,"line":18}},"range":[380,381],"value":"{"},{"type":"Identifier","loc":{"end":{"column":16,"line":18},"start":{"column":12,"line":18}},"range":[382,386],"value":"name"},{"type":"Punctuator","loc":{"end":{"column":17,"line":18},"start":{"column":16,"line":18}},"range":[386,387],"value":":"},{"type":"String","loc":{"end":{"column":25,"line":18},"start":{"column":18,"line":18}},"range":[388,395],"value":"\"phone\""},{"type":"Punctuator","loc":{"end":{"column":26,"line":18},"start":{"column":25,"line":18}},"range":[395,396],"value":","},{"type":"Identifier","loc":{"end":{"column":33,"line":18},"start":{"column":27,"line":18}},"range":[397,403],"value":"length"},{"type":"Punctuator","loc":{"end":{"column":34,"line":18},"start":{"column":33,"line":18}},"range":[403,404],"value":":"},{"type":"Numeric","loc":{"end":{"column":38,"line":18},"start":{"column":35,"line":18}},"range":[405,408],"value":"255"},{"type":"Punctuator","loc":{"end":{"column":39,"line":18},"start":{"column":38,"line":18}},"range":[408,409],"value":","},{"type":"Identifier","loc":{"end":{"column":48,"line":18},"start":{"column":40,"line":18}},"range":[410,418],"value":"nullable"},{"type":"Punctuator","loc":{"end":{"column":49,"line":18},"start":{"column":48,"line":18}},"range":[418,419],"value":":"},{"type":"Boolean","loc":{"end":{"column":55,"line":18},"start":{"column":50,"line":18}},"range":[420,425],"value":"false"},{"type":"Punctuator","loc":{"end":{"column":56,"line":18},"start":{"column":55,"line":18}},"range":[425,426],"value":","},{"type":"Identifier","loc":{"end":{"column":63,"line":18},"start":{"column":57,"line":18}},"range":[427,433],"value":"unique"},{"type":"Punctuator","loc":{"end":{"column":64,"line":18},"start":{"column":63,"line":18}},"range":[433,434],"value":":"},{"type":"Boolean","loc":{"end":{"column":69,"line":18},"start":{"column":65,"line":18}},"range":[435,439],"value":"true"},{"type":"Punctuator","loc":{"end":{"column":71,"line":18},"start":{"column":70,"line":18}},"range":[440,441],"value":"}"},{"type":"Punctuator","loc":{"end":{"column":72,"line":18},"start":{"column":71,"line":18}},"range":[441,442],"value":")"},{"type":"Punctuator","loc":{"end":{"column":3,"line":19},"start":{"column":2,"line":19}},"range":[445,446],"value":"@"},{"type":"Identifier","loc":{"end":{"column":8,"line":19},"start":{"column":3,"line":19}},"range":[446,451],"value":"Index"},{"type":"Punctuator","loc":{"end":{"column":9,"line":19},"start":{"column":8,"line":19}},"range":[451,452],"value":"("},{"type":"Punctuator","loc":{"end":{"column":10,"line":19},"start":{"column":9,"line":19}},"range":[452,453],"value":")"},{"type":"Identifier","loc":{"end":{"column":7,"line":20},"start":{"column":2,"line":20}},"range":[456,461],"value":"phone"},{"type":"Punctuator","loc":{"end":{"column":8,"line":20},"start":{"column":7,"line":20}},"range":[461,462],"value":":"},{"type":"Identifier","loc":{"end":{"column":15,"line":20},"start":{"column":9,"line":20}},"range":[463,469],"value":"string"},{"type":"Punctuator","loc":{"end":{"column":16,"line":20},"start":{"column":15,"line":20}},"range":[469,470],"value":";"},{"type":"Punctuator","loc":{"end":{"column":1,"line":21},"start":{"column":0,"line":21}},"range":[471,472],"value":"}"}],"loc":{"end":{"column":1,"line":21},"start":{"column":0,"line":1}},"parent":null}
    "#;

    let result = convert_from_typeorm_v2(payload);

    println!("result: {}", result)
}
