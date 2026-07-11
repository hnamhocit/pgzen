#!/bin/bash
sed -i 's/Ok(tables)/println!("Tables found in db {}, schema {}: {:?}", database, schema, tables); Ok(tables)/' src-tauri/src/db.rs
sed -i 's/let rows = client/println!("Connecting to db: {}", database);\n    let rows = client/' src-tauri/src/db.rs
