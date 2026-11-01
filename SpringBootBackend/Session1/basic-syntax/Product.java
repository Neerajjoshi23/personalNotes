// file: Product.java
// A top-level CLASS: one public class per file, and the file name must equal the class name.
// This is how real projects look (Spring: OrderService.java, OrderController.java, ...).
public class Product {

    // FIELDS (data). private = only this class can touch it (encapsulation).
    private final String sku;          // final = assigned once in the constructor
    private String name;
    private int stock;
    private static int createdCount = 0;   // static = shared by the whole class, not per object

    // CONSTRUCTOR: same name as the class, no return type. Runs on `new Product(...)`.
    public Product(String sku, String name, int stock) {
        this.sku = sku;                // `this` = the current object
        this.name = name;
        this.stock = stock;
        createdCount++;
    }

    // METHODS (behaviour): modifier, return type, name, (parameters)
    public String getSku() { return sku; }
    public String getName() { return name; }
    public int getStock() { return stock; }
    public void setName(String name) { this.name = name; }

    public boolean sell(int qty) {
        if (qty <= 0 || qty > stock) {
            return false;
        }
        stock -= qty;
        return true;
    }

    public static int getCreatedCount() { return createdCount; }

    @Override   // compiler checks that we really override Object.toString()
    public String toString() { return name + " (" + sku + ") stock=" + stock; }
}
