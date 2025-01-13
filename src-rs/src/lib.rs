use serde_json::Value;
use wasm_bindgen::prelude::*;

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
        let column_name = column["name"].as_str().unwrap_or("");
        let data_type = column["dataType"].as_str().unwrap_or("string");
        let is_nullable = column["nullable"].as_bool().unwrap_or(false);
        let is_primary = column["id"] == data["data"]["primaryKey"];
        let is_unique = column["unique"].as_bool().unwrap_or(false);
        let is_auto_increment = column["autoIncrement"].as_bool().unwrap_or(false);
        let length = column["length"].as_u64();

        // Start building the column decorator
        let mut column_decorator = "@Column({".to_string();
        column_decorator.push_str(&format!("type: \"{}\"", data_type));

        if let Some(len) = length {
            column_decorator.push_str(&format!(", length: {}", len));
        }

        if is_nullable {
            column_decorator.push_str(", nullable: true");
        }

        if is_unique {
            column_decorator.push_str(", unique: true");
        }

        column_decorator.push('}');

        // Add primary key or auto increment if applicable
        if is_primary {
            column_decorator = "@PrimaryGeneratedColumn()".to_string();
        } else if is_auto_increment {
            column_decorator = "@PrimaryGeneratedColumn()".to_string();
        }

        // Generate the column definition
        entity_code.push_str(&format!("    {} {}\n", column_decorator, column_name));
    }

    // Close the entity definition
    entity_code.push('}');

    entity_code
}
