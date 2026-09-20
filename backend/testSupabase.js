const supabase = require("./supabase");

async function test() {

    const { data, error } = await supabase
        .from("products")
        .select("*");

    if (error) {
        console.error("Supabase error:", error);
        return;
    }

    console.log("Supabase connected!");
    console.log(data);
}

test();