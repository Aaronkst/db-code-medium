use nanoid::nanoid;
use serde_json::{from_str, json, to_string, Value};

pub fn parse_json(json_string: &str) -> Value {
    // correct lazy json strings that do not include quoted keys.
    let json_quotes = regex::Regex::new(r"(\w+)(:)").unwrap();
    let corrected_json_string = json_quotes.replace_all(json_string, r#""$1"$2"#);

    let parsed_json: Value = from_str(&corrected_json_string).unwrap_or_else(|_| json!({}));
    parsed_json
}

pub fn stringify_json(object: Value) -> String {
    to_string(&object).unwrap().to_string()
}

pub fn trim_quotes(s: &str) -> &str {
    s.trim_matches(&['\'', '"', '\"'][..])
}

pub fn get_default_table() -> Value {
    let id = nanoid!();
    let table_object = json!({
        "id": id,
        "type": "table",
        "data": {
            "id": id,
            "name": "",
            "dbName": "",
            "primaryKey": "",
            "description": "",
            "timestamps": true,
            "engine": "InnoDB",
            "columns": [],
            "joins": []
        }
    });
    table_object
}

pub fn get_default_column() -> Value {
    let column_object = json!({
        "id": nanoid!(),
        "name": "",
        "dbName": "",
        "dataType": "string",
        "primaryKey": false,
        "index": false,
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
    column_object
}

pub fn foreign_key_options_extractor(arguments: &Vec<Value>, key_type: &str) -> Value {
    let mut foreign_key = json!({
        "target": null,
        "onDelete": "RESTRICT",
        "onUpdate": "RESTRICT",
        "through": null,
        "source": null,
        "type": key_type
    });
    let mut i = 0;

    let mut target_table = String::new();
    let mut target_column = String::new();

    let empty_array = Vec::new();
    for argument in arguments {
        let mut argument_type = argument["type"].to_string();
        argument_type = trim_quotes(&argument_type).to_string();

        if i == 0 && argument_type == "ArrowFunctionExpression" {
            // first argument, always a function that returns the target table.
            target_table = argument["body"].get("name").unwrap().to_string();
            target_table = trim_quotes(&target_table).to_string();
        }

        if i == 1 && argument_type == "ArrowFunctionExpression" {
            // second argument, always a function that defines the target column.
            target_column = argument["body"]["property"]
                .get("name")
                .unwrap()
                .to_string();
            target_column = trim_quotes(&target_column).to_string();
        }

        if i == 2 && argument_type == "ObjectExpression" {
            // third argument, always a join options object
            let join_options = argument["properties"].as_array().unwrap_or(&empty_array);
            if join_options.len() > 0 {
                for option in join_options {
                    if let Some(key_name) = option["key"].get("name").unwrap().as_str() {
                        let key = trim_quotes(key_name);
                        let mut value = option["value"]["value"].to_string();
                        value = trim_quotes(&value).to_string();

                        match key {
                            "onDelete" => foreign_key["onDelete"] = json!(value),
                            "onUpdate" => foreign_key["onDelete"] = json!(value),
                            _ => {}
                        }
                    }
                }
            }
        }

        i = i + 1;
    }

    foreign_key["target"] = json!({
        "table": target_table,
        "column": target_column
    });

    foreign_key
}

pub fn basic_column_options_extractor(mut column_object: Value, arguments: &Vec<Value>) -> Value {
    let empty_array = Vec::new();
    for argument in arguments {
        let argument_type = argument["type"].as_str().unwrap_or("");
        if argument_type == "ObjectExpression" {
            let column_options = argument["properties"].as_array().unwrap_or(&empty_array);
            for option in column_options {
                if let Some(key_name) = option["key"].get("name").unwrap().as_str() {
                    let key = trim_quotes(key_name);

                    let mut value = option["value"]["value"].to_string();
                    value = trim_quotes(&value).to_string();

                    match key {
                        "name" => column_object["dbName"] = json!(value),
                        "type" => column_object["dataType"] = json!(value),
                        "index" => column_object["index"] = json!(value),
                        "unique" => column_object["unique"] = json!(value),
                        "nullable" => column_object["nullable"] = json!(value),
                        "default" => column_object["defaultValue"] = json!(value),
                        "length" => column_object["length"] = json!(value),
                        "precision" => column_object["precision"] = json!(value),
                        "scale" => column_object["scale"] = json!(value),
                        "collation" => column_object["collation"] = json!(value),
                        "autoIncrement" => column_object["autoIncrement"] = json!(value),
                        "select" => column_object["select"] = json!(value),
                        "zerofill" => column_object["zerofill"] = json!(value),
                        "enum" => {
                            column_object["enum"] = value
                                .clone()
                                .to_string()
                                .split(",")
                                .map(|s| Value::String(s.to_string())) // Convert each item to Value::String
                                .collect()
                        }
                        "enumName" => column_object["enumName"] = json!(value),
                        "hstoreType" => column_object["hstoreType"] = json!(value),
                        "unqiue" => column_object["unique"] = json!(value),
                        "array" => column_object["array"] = json!(value),
                        _ => {} // do nothing
                    }
                }
            }
        }
    }
    column_object
}

pub fn join_column_options_extractor(mut column_object: Value, arguments: &Vec<Value>) -> Value {
    let empty_array = Vec::new();
    for argument in arguments {
        let argument_type = argument["type"].as_str().unwrap_or("");
        if argument_type == "ObjectExpression" {
            let column_options = argument["properties"].as_array().unwrap_or(&empty_array);
            for option in column_options {
                if let Some(key_name) = option["key"].get("name").unwrap().as_str() {
                    let key = trim_quotes(key_name);

                    let mut value = option["value"]["value"].to_string();
                    value = trim_quotes(&value).to_string();

                    match key {
                        "name" => column_object["dbName"] = json!(value),
                        "referencedColumnName" => {
                            column_object["foreignKey"]["target"]["column"] = json!(value);
                        }
                        _ => {} // do nothing
                    }
                }
            }
        }
    }
    column_object
}

pub fn join_table_options_extractor(mut column_object: Value, arguments: &Vec<Value>) -> Value {
    let empty_array = Vec::new();
    for argument in arguments {
        let argument_type = argument["type"].as_str().unwrap_or("");
        if argument_type == "ObjectExpression" {
            let column_options = argument["properties"].as_array().unwrap_or(&empty_array);
            for option in column_options {
                if let Some(key_name) = option["key"].get("name").unwrap().as_str() {
                    let key = trim_quotes(key_name);

                    let mut value = option["value"]["value"].to_string();
                    value = trim_quotes(&value).to_string();

                    match key {
                        "name" => column_object["foreignKey"]["through"] = json!(value),
                        // TODO: research how to handle
                        "joinColumn" => {}
                        "inverseJoinColumn" => {}
                        _ => {} // do nothing
                    }
                }
            }
        }
    }
    column_object
}

pub fn ts_type_extractor(attribute: &Value) -> String {
    if let Some(type_name) = attribute["typeAnnotation"]["typeAnnotation"]
        .get("typeName")
        .unwrap_or(&json!(""))
        .as_object()
    {
        let mut return_type = type_name["name"].to_string();
        return_type = trim_quotes(&return_type).to_string();
        return_type
    } else {
        let mut return_type = String::new();
        if let Some(ts_type) = attribute["typeAnnotation"]["typeAnnotation"]
            .get("type")
            .unwrap()
            .as_str()
        {
            match ts_type {
                "TSStringKeyword" => return_type = String::from("string"),
                "TSNumberKeyword" => return_type = String::from("number"),
                "TSBooleanKeyword" => return_type = String::from("boolean"),
                "TSArrayType" => {} // TODO: array type in typeorm.
                _ => {}
            }
        }
        return_type
    }
}
