// file: DigitalProduct.java
// INHERITANCE: `extends` ONE class, `implements` MANY interfaces.
public class DigitalProduct extends Product implements Discountable {

    public DigitalProduct(String sku, String name) {
        super(sku, name, Integer.MAX_VALUE);   // super(...) must be the FIRST line: builds the parent part
    }

    @Override
    public double discountPercent() { return 10.0; }
}
