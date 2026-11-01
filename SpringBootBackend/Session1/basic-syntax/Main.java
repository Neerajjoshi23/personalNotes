// file: Main.java
// ENTRY POINT. The JVM looks for exactly: public static void main(String[] args)
//   public = JVM can call it | static = no object needed | void = returns nothing
// Classes in the same folder (same package) see each other without import.
import java.util.ArrayList;   // import = shortcut for a class name (not #include)
import java.util.List;

public class Main {

    public static void main(String[] args) {

        // Primitive types = values (like C++)
        int count = 3;
        long big = 10_000_000_000L;      // L suffix for long; underscores for readability
        double price = 19.99;
        boolean active = true;
        char letter = 'A';               // single quotes = char
        var inferred = 42;               // `var`: compiler infers int, still statically typed

        // String is a class; double quotes; + joins
        String greeting = "Hello";
        System.out.println(greeting + ", count=" + count + ", price=" + price);

        // Objects: created with `new`, variable holds a REFERENCE to a heap object
        Product p = new Product("SKU-1", "Keyboard", 10);
        System.out.println(p);                                   // calls toString()
        System.out.println("sold 3? " + p.sell(3) + ", now " + p.getStock());
        System.out.println("sold 50? " + p.sell(50));

        new Product("SKU-2", "Mouse", 5);
        System.out.println("products created: " + Product.getCreatedCount());   // static: via class name

        // Polymorphism: parent type variable, child object
        Product d = new DigitalProduct("SKU-3", "E-book");
        if (d instanceof Discountable disc) {                    // check type + cast in one step
            System.out.println(d.getName() + " discount " + disc.discountPercent() + "%");
        }

        // Loops
        for (int i = 0; i < 3; i++) {
            System.out.print(i + " ");
        }
        System.out.println();

        List<Product> list = new ArrayList<>();                  // List = interface, ArrayList = implementation
        list.add(p);
        list.add(d);
        for (Product item : list) {
            System.out.println("item: " + item.getName());
        }

        // switch expression (Java 14+): no fallthrough, returns a value
        int day = 2;
        String name = switch (day) {
            case 1 -> "Mon";
            case 2 -> "Tue";
            default -> "Other";
        };
        System.out.println("day = " + name);

        // Exceptions
        try {
            int[] arr = new int[2];
            arr[5] = 1;
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("caught: " + e.getMessage());
        } finally {
            System.out.println("finally always runs");
        }

        // Access modifiers: public = anyone | protected = package + subclasses
        //                   (none) = same package | private = this class only
        // Naming: Classes PascalCase, methods/variables camelCase, constants UPPER_SNAKE
        // Package layout: package com.example.shopflow.order; -> src/main/java/com/example/shopflow/order/
    }
}

// NESTED classes (a class inside another class) also exist, e.g. `static class Product {}` inside Main.
// They are used for small helper types. The earlier BasicJavaSyntax.java nested everything only
// so one file could run with `java File.java`. Real code: top-level classes, one per file.
// Nested classes are covered in session 1, section 5.
