fn main() {
    let e = keyring::Entry::new("a", "b").unwrap();
    e.delete_credential();
}
