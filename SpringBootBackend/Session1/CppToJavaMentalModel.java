// file: CppToJavaMentalModel.java
// Run: java CppToJavaMentalModel.java        (Java 21, no javac needed)
//
// Session 1, Section 1: C++ to Java mental model.
// One block per row of the "C++ habit vs Java reality" table.
// Each block prints something so you SEE the difference, and the comments say what to tell.
//
// ===========================================================================================
// HOW JAVA CODE GOES FROM SOURCE TO A RUNNING PROGRAM (the diagram at the top of Section 1)
// ===========================================================================================
//
//   Order.java --javac--> Order.class (bytecode) --> JVM --+--> Interpreter
//    (source)              (portable, not machine code)     +--> JIT compiler -> machine code
//                                                           +--> Garbage collector
//
//   mvn package --> app.jar --java -jar--> JVM
//
// 1. Order.java       : the source you write.
// 2. javac            : the compiler. Unlike C++ it does NOT produce machine code. It produces
//                       BYTECODE in Order.class, which is portable and not tied to a CPU.
// 3. JVM (Java Virtual Machine) loads the .class files and runs them. It does three jobs:
//    - Interpreter    : starts running bytecode at once, line by line. Slow, but no warm-up.
//    - JIT compiler   : watches for HOT code (methods called thousands of times) and compiles it
//                       to real machine code while the program runs. This is why a warmed-up
//                       Java service is fast.
//    - Garbage collector (GC): frees objects nobody references any more. Replaces delete and
//                       destructors from C++.
// 4. Maven route      : `mvn package` compiles all your classes and bundles them with their
//                       dependencies into one app.jar. `java -jar app.jar` hands it to the JVM.
//                       This is how a Spring Boot app starts in production.
//
// WHY IT MATTERS
// - Compile once, run on any OS that has a JVM.
// - Slow start-up, extra memory and GC pauses are the real costs of the JVM (not raw speed).
// - `java File.java` (used by the demos here) is a shortcut: it compiles in memory and runs at once.

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;


public class CppToJavaMentalModel {

    // Tiny domain type used in several demos (shopflow: an order).
    static class Order {
        String id;
        int qty;
        Order(){}
        Order(String id, int qty) { this.id = id; this.qty = qty; }
        @Override public String toString() { return id + " x" + qty; }
        void setId(String id) { this.id = id; }
    }

    public static void main(String[] args) throws Exception {

        // row1_objectsLiveOnHeap(); // read that objects live on the heap and variables are references
        // row2_noImplicitCopy();   // read that there is no copy constructor or assignment by value
        // row3_noRaii_tryWithResources(); // read will keep in mind curently not too deep
        // row4_noDanglingPointers_butLeaksExist();  // read will keep in mind curently not too deep
        // row5_equalsVsIdentity(); // read and understand the difference between identity and value equality
        // row6_genericsAreErased(); // read and work with the idea that generics are erased at runtime fix will seen when needed
        // row7_packagesAndFiles(); // understand how Java packages map to file system and classpath and its just shorthand for organizing code
        // row8_interfacesAndSingleInheritance(); // read and understand how Java handles interfaces and single inheritance
        // row9_allMethodsAreVirtual(); // read and understand that all non-static methods are
                                       //  virtual by default and static is class level so no confusion 
                                       // of overriding static methods and if base pointer points to derived object,
                                       //  derived method will be called. ( unlike c++ where pure virtual of derived is called and non virtual method of base is called even if base pointer points to derived object )
        // row10_noUndefinedBehaviour();  
        // row11_finalIsNotConst();
        // row12_noUnsigned();
        // row13_stringImmutableCharIs16Bit();
        // row14_noOperatorOverloading();
        // row15_checkedVsUncheckedExceptions();
        // row16_threadsByDefault();
        // row17_mavenAndClasspath();
    }

    // ---------------------------------------------------------------------------------------
    // 1. C++: objects live on the stack by value.  Java: objects ALWAYS live on the heap.
    // ---------------------------------------------------------------------------------------
    static void row1_objectsLiveOnHeap() {
        System.out.println("\n--- 1. Objects are on the heap, variables are references ---");
        int a = 5;            // primitive: the variable HOLDS the value (like C++ int)
        int b = a;            // real copy
        b = 6;
        System.out.println("primitives: a=" + a + " b=" + b);   // a=5 b=6

        Order o1 = new Order("A-1", 1);   // 'o1' is a REFERENCE (like a pointer), object is on heap
        Order o2 = o1;                    // C++ would copy the object. Java copies only the pointer.
        o2.qty = 99;
        System.out.println("o1=" + o1 + " o2=" + o2);           // both show x99: ONE object, two names
        // TELL: there is no "Order o;" holding an Order directly. It is always a pointer.
        // Only int/long/double/boolean/char/byte/short/float are values.
    }

    // ---------------------------------------------------------------------------------------
    // 2. C++: copy constructor / assignment copies.  Java: no implicit copy.
    // ---------------------------------------------------------------------------------------
    static void row2_noImplicitCopy() {
        System.out.println("\n--- 2. No implicit copy: write copy() yourself, or use defensive copies ---");
        List<String> original = new ArrayList<>(List.of("p1", "p2"));

        List<String> alias = original;                 // NOT a copy
        List<String> copy = new ArrayList<>(original); // real (shallow) copy
        original.add("p3");
        original.set(0, "p0");
        // very important is that strings are immutable, so the shallow copy is usually enough for lists of strings.
        System.out.println("alias=" + alias + " copy=" + copy);  // alias sees p3, copy does not
        List<Order> orders = new ArrayList<>(List.of(new Order("B-1", 1), new Order("B-2", 2)));
        List<Order> ordersCopy = new ArrayList<>(orders);  // shallow copy of orders list
        orders.get(0).setId("B-1-modified");  // modifying original after creating the copy
        System.out.println("orders=" + orders + " ordersCopy=" + ordersCopy);  // ordersCopy sees the old state, orders sees the modification
        // TELL: in DTOs/entities, return `List.copyOf(items)` or an unmodifiable view so callers
        // cannot mutate your internal state. "Shallow" copy: elements are still shared references.
    }

    // ---------------------------------------------------------------------------------------
    // 3. C++: RAII + destructors.  Java: GC frees memory at an unknown time -> try-with-resources.
    // ---------------------------------------------------------------------------------------
    static class Connection implements AutoCloseable {   // AutoCloseable = "has close()"
        final String name;
        Connection(String name) { this.name = name; System.out.println("open  " + name); }
        @Override public void close() { System.out.println("close " + name); }
        // Do NOT rely on finalize()/GC to call this. There is no deterministic destructor.
    }

    static void row3_noRaii_tryWithResources() {
        System.out.println("\n--- 3. No RAII: use try-with-resources for anything that must be closed ---");
        try (Connection c1 = new Connection("db");
             Connection c2 = new Connection("redis")) {
            System.out.println("working with " + c1.name + " and " + c2.name);
        }
        // Output order: open db, open redis, working..., close redis, close db  (reverse order, like C++ scope exit)
        // TELL: JDBC connections, streams, HTTP responses, locks: always try-with-resources,
        // otherwise you leak them under load (connection pool exhausted).
    }

    // ---------------------------------------------------------------------------------------
    // 4. C++: delete / dangling pointer / use-after-free.  Java: impossible, but LEAKS still happen.
    // ---------------------------------------------------------------------------------------
    static final Map<String, byte[]> UNBOUNDED_CACHE = new HashMap<>();   // static = lives as long as the JVM

    static void row4_noDanglingPointers_butLeaksExist() {
        System.out.println("\n--- 4. No dangling pointers, but a static map is a memory leak ---");
        Order x = new Order("A-2", 1);
        x = null;   // object becomes unreachable -> GC may free it. You never call delete.
        // Using a freed object is impossible: if you still hold a reference, the object is alive.

        for (int i = 0; i < 3; i++) {
            UNBOUNDED_CACHE.put("key" + i, new byte[1024]);   // reachable from a static -> never freed
        }
        System.out.println("cache entries kept forever: " + UNBOUNDED_CACHE.size());
        // TELL: "leak" in Java = still reachable but no longer needed. Unbounded caches, listeners
        // never removed, ThreadLocals not cleared. Use bounded caches (Caffeine/Redis with TTL).
    }

    // ---------------------------------------------------------------------------------------
    // 5. C++: == on overloaded types compares values.  Java: == is identity, equals() is value.
    // ---------------------------------------------------------------------------------------
    static class Sku {
        final String code;
        public String name;
        Sku(String code, String name) { this.code = code; this.name = name; }
        @Override public boolean equals(Object o) { return o instanceof Sku s && Objects.equals(this.code, s.code) && Objects.equals(this.name, s.name); }
        @Override public int hashCode() { return Objects.hash(code, name); }   // ALWAYS override with equals
    }

    static void row5_equalsVsIdentity() {
        System.out.println("\n--- 5 == is identity, equals() is value equality ---");
        Sku s1 = new Sku("SKU-1","N1");
        Sku s2 = new Sku("SKU-1","N1");
        System.out.println("s1 == s2      : " + (s1 == s2));        // false: two different objects
        System.out.println("s1.equals(s2) : " + s1.equals(s2));     // true: same value
        // first hashCode() is called to find the bucket, then equals() is called to find the exact key
        // TELL: always override hashCode() when overriding equals() to maintain the contract with hash-based collections.
        Map<Sku, Integer> stock = new HashMap<>();
        stock.put(s1, 10);
        System.out.println("lookup by equal key: " + stock.get(s2)); // 10 only because hashCode+equals match
        // TELL: forget hashCode() and the lookup returns null. Same rule for JPA entities and Set<Id>.
    }

    // ---------------------------------------------------------------------------------------
    // 6. C++ templates (per-type code).  Java generics: ERASED, one class, casts inserted.
    // ---------------------------------------------------------------------------------------
    // Java Generics are for compile-time safety only. Once the code runs, all specific types inside the angle brackets < > disappear entirely, and everything defaults back to raw object pointers.
    static void row6_genericsAreErased() {
        System.out.println("\n--- 6. Generics are erased at runtime ---");
        List<String> strings = new ArrayList<>();
        List<Integer> ints = new ArrayList<>();
        System.out.println("same runtime class? " + (strings.getClass() == ints.getClass()));  // true

        // List<int> bad;            // does not compile: generics need objects, use List<Integer>
        // T t = new T();            // does not compile: T does not exist at runtime
        // TELL: that is why Jackson needs `new TypeReference<List<Order>>() {}` and Spring's
        // RestTemplate needs `ParameterizedTypeReference`: they must capture the type in a subclass.

        // This is safe as in compile time, the type is checked, but at runtime, the type information is erased. and it become risky
        List<Order> orders = new ArrayList<>(List.of(new Order(), new Order()));
    }

    // ---------------------------------------------------------------------------------------
    // 7. C++ headers/namespaces.  Java: packages = folders, file name = public class name.
    // ---------------------------------------------------------------------------------------
    static void row7_packagesAndFiles() {
        System.out.println("\n--- 7. Packages and files (explained, not runnable here) ---");
        System.out.println("package com.example.shopflow.order;  ->  src/main/java/com/example/shopflow/order/OrderService.java");
        // TELL: one public top-level class per file, file name must equal class name.
        // No header files. `import` just saves typing the full name; it is not an #include.
        // (This demo has no `package` line so `java CppToJavaMentalModel.java` works directly.)
    }

    // ---------------------------------------------------------------------------------------
    // 8. C++ multiple inheritance.  Java: one superclass, many interfaces (with default methods).
    // ---------------------------------------------------------------------------------------
    interface Payable { double amount(); default String describe() { return "pay " + amount(); } }
    interface Shippable { default String describe2() { return "ship it"; } }
    static class Base { String who() { return "Base"; } }
    static class Invoice extends Base implements Payable, Shippable {   // extends ONE class, implements MANY interfaces
        public double amount() { return 42.0; }
    }

    static void row8_interfacesAndSingleInheritance() {
        System.out.println("\n--- 8. One superclass, many interfaces ---");
        Invoice inv = new Invoice();
        System.out.println(inv.who() + " / " + inv.describe() + " / " + inv.describe2());
        // TELL: Spring services are written as interface + implementation. Spring wraps the
        // interface in a dynamic proxy (for @Transactional etc.). Section 10 builds that.
        
    }

    // ---------------------------------------------------------------------------------------
    // 9. C++: non-virtual unless `virtual`.  Java: all instance methods are virtual.
    // ---------------------------------------------------------------------------------------
    static class Animal { String sound() { return "..."; } static String kind() { return "animal"; } }
    static class Dog extends Animal {
        @Override String sound() { return "woof"; }       // @Override: compiler checks you really override
        static String kind() { return "dog"; }            // static methods are HIDDEN, not overridden
    }

    static void row9_allMethodsAreVirtual() {
        System.out.println("\n--- 9. Every instance non static method is virtual ---");
        Animal a = new Dog();                              // declared type Animal, real type Dog
        System.out.println("a.sound() = " + a.sound());    // woof: dispatch by REAL type, no `virtual` keyword needed
        System.out.println("Animal.kind() = " + Animal.kind() + ", Dog.kind() = " + Dog.kind());
        // TELL: `final` on a method/class = "design statement: do not override".
        // Spring's CGLIB proxies cannot proxy final classes/methods -> @Transactional silently skipped.
        // =======================================================================================
        // KEY TAKEAWAYS: INHERITANCE, INTERFACES, AND POLYMORPHISM
        // =======================================================================================

        // 1. SINGLE INHERITANCE ONLY
        // A class can extend exactly one parent class, completely eliminating the C++ class Diamond Problem.

        // 2. MULTIPLE INTERFACES WITH DEFAULT LOGIC
        // A class can implement infinite interfaces, which can share concrete fallback code using 'default' methods.

        // 3. COLLISION RESOLUTION (THE REFEREE RULE)
        // If two interfaces share an identical default method, you must override it and pick a winner using InterfaceName.super.method().

        // 4. ALWAYS VIRTUAL BY DEFAULT
        // All non-static methods are virtual by default; dynamic dispatch always calls the heap object's method regardless of reference type.

        // 5. FINAL METHODS AND CLASSES
        // You can prevent overriding by marking methods or classes as `final`. This is useful for design clarity and performance optimizations.
        // Example:
        // final class Base { final void method() {} }
        // class Derived extends Base { // ERROR: cannot extend final class
        //     void method() { // ERROR: cannot override final method
        //     }
        // }
       

    }

    // ---------------------------------------------------------------------------------------
    // 10. C++ undefined behaviour.  Java: defined behaviour; overflow wraps silently.
    // ---------------------------------------------------------------------------------------
    static void row10_noUndefinedBehaviour() {
        System.out.println("\n--- 10. No UB: exceptions, but integer overflow is silent ---");
        try {
            int[] arr = new int[2];
            System.out.println(arr[5]);
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("caught: " + e.getMessage());     // defined, catchable
        }
        try {
            Order o = null;
            System.out.println(o.qty);
        } catch (NullPointerException e) {
            System.out.println("caught NullPointerException");
        }

        int cents = Integer.MAX_VALUE;          // 2,147,483,647 cents = ~21.4 million dollars
        System.out.println("MAX + 1 = " + (cents + 1));            // -2147483648: wraps, NO exception
        long safe = (long) Integer.MAX_VALUE + 1;
        System.out.println("as long  = " + safe);
        System.out.println("exact add: " + tryExact(cents));
        // TELL: money in int cents overflows at ~21M dollars. Use long (or BigDecimal),
        // and Math.addExact(...) if you want an exception instead of silent wrap-around.
    }

    static String tryExact(int v) {
        try { return String.valueOf(Math.addExact(v, 1)); }
        catch (ArithmeticException e) { return "ArithmeticException: " + e.getMessage(); }
    }

    // ---------------------------------------------------------------------------------------
    // 11. C++ const.  Java: final = the VARIABLE cannot be reassigned; the object can still change.
    // ---------------------------------------------------------------------------------------
    static void row11_finalIsNotConst() {
        System.out.println("\n--- 11. final is not const ---");
        final List<String> items = new ArrayList<>();
        items.add("p1");                    // allowed: the object is mutable
        // items = new ArrayList<>();       // compile error: cannot reassign a final variable
        System.out.println("final list still mutable: " + items);

        List<String> frozen = List.of("p1");   // truly immutable collection
        try { frozen.add("p2"); }
        catch (UnsupportedOperationException e) { System.out.println("List.of is immutable: UnsupportedOperationException"); }
        // TELL: immutability = final fields + no setters + immutable members, or just use a record.
    }

    // ---------------------------------------------------------------------------------------
    // 12. C++ unsigned / size_t / pointer arithmetic.  Java: none of that.
    // ---------------------------------------------------------------------------------------
    static void row12_noUnsigned() {
        System.out.println("\n--- 12. No unsigned types, no pointer arithmetic ---");
        byte b = (byte) 200;                                   // bytes are signed: -128..127
        System.out.println("(byte)200 = " + b + ", as unsigned = " + Byte.toUnsignedInt(b));
        int big = (int) 3_000_000_000L;                        // does not fit in int
        System.out.println("(int)3e9 = " + big + ", unsigned view = " + Integer.toUnsignedString(big));
        // TELL: use the helper methods (Integer.toUnsignedString, Long.compareUnsigned...) when you
        // must deal with unsigned data (binary protocols, hashes). Arrays are bounds-checked; no p++.
    }

    // ---------------------------------------------------------------------------------------
    // 13. C++ std::string mutable, char 1 byte.  Java: String immutable, char = 16-bit UTF-16 unit.
    // ---------------------------------------------------------------------------------------
    static void row13_stringImmutableCharIs16Bit() {
        System.out.println("\n--- 13. String is immutable; never compare with == ---");
        String s = "shop";
        s.toUpperCase();                                       // result thrown away! s is unchanged
        System.out.println("after toUpperCase() ignored: " + s);
        s = s.toUpperCase();                                   // must reassign
        System.out.println("reassigned: " + s);

        String a = new String("flow");
        String b = new String("flow");
        System.out.println("a == b: " + (a == b) + ", a.equals(b): " + a.equals(b));   // false, true

        StringBuilder sb = new StringBuilder();                // use in loops: += creates a new String each time
        for (int i = 0; i < 3; i++) sb.append("item").append(i).append(';');
        System.out.println(sb);

        String emoji = "A\uD83D\uDE00";                        // 'A' + one emoji (outside the 16-bit range)
        System.out.println("length() = " + emoji.length() + " but code points = " + emoji.codePointCount(0, emoji.length()));
        // TELL: length() counts UTF-16 units, so an emoji counts as 2. Matters for length validation.
    }

    // ---------------------------------------------------------------------------------------
    // 14. C++ operator overloading.  Java: none (except + on String).
    // ---------------------------------------------------------------------------------------
    static void row14_noOperatorOverloading() {
        System.out.println("\n--- 14. No operator overloading: BigDecimal.add() instead of + ---");
        System.out.println("double 0.1+0.2 = " + (0.1 + 0.2));                       // 0.30000000000000004
        BigDecimal x = new BigDecimal("0.10");                // build from String, never from double
        BigDecimal y = new BigDecimal("0.20");
        System.out.println("BigDecimal 0.10+0.20 = " + x.add(y));                     // 0.30
        // TELL: money = BigDecimal (or long cents). Compare with compareTo(), NOT equals():
        System.out.println("2.0 equals 2.00 ? " + new BigDecimal("2.0").equals(new BigDecimal("2.00"))
                + " / compareTo==0 ? " + (new BigDecimal("2.0").compareTo(new BigDecimal("2.00")) == 0));
    }

    // ---------------------------------------------------------------------------------------
    // 15. C++ exceptions all "unchecked".  Java: checked (compiler forces) + unchecked.
    // ---------------------------------------------------------------------------------------
    static void readFile() throws java.io.IOException {        // checked: must be declared or caught
        throw new java.io.IOException("disk gone");
    }

    static void row15_checkedVsUncheckedExceptions() {
        System.out.println("\n--- 15. Checked vs unchecked exceptions ---");
        try {
            readFile();                                        // compiler FORCES try/catch or `throws`
        } catch (java.io.IOException e) {
            System.out.println("checked caught: " + e.getMessage());
        }
        try {
            throw new IllegalStateException("order already shipped");   // unchecked: no declaration needed
        } catch (RuntimeException e) {
            System.out.println("unchecked caught: " + e.getMessage());
        }
        // TELL: Spring code is unchecked by convention. @Transactional rolls back on RuntimeException
        // and Error by DEFAULT, but NOT on checked exceptions. Details in section 9.
    }

    // ---------------------------------------------------------------------------------------
    // 16. C++ threads + mutexes by hand.  Java: executors, CompletableFuture, virtual threads (21).
    // ---------------------------------------------------------------------------------------
    static void row16_threadsByDefault() throws Exception {
        System.out.println("\n--- 16. Concurrency toolbox ---");
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {   // pool of 2 worker threads
            var f1 = java.util.concurrent.CompletableFuture.supplyAsync(
                    () -> "stock from " + Thread.currentThread().getName(), pool);
            var f2 = java.util.concurrent.CompletableFuture.supplyAsync(
                    () -> "price from " + Thread.currentThread().getName(), pool);
            System.out.println(f1.get() + " | " + f2.get());
        }
        Thread vt = Thread.ofVirtual().start(() -> System.out.println("virtual thread: " + Thread.currentThread().isVirtual()));
        vt.join();
        // TELL: Tomcat serves each HTTP request on a pool thread, so a singleton @Service
        // is used by many threads at once. Never keep per-request state in its fields.
    }

    // ---------------------------------------------------------------------------------------
    // 17. CMake/Conan + #include  ->  Maven + classpath.
    // ---------------------------------------------------------------------------------------
    static void row17_mavenAndClasspath() {
        System.out.println("\n--- 17. Maven and the classpath ---");
        System.out.println("classpath = " + System.getProperty("java.class.path"));
        // TELL: pom.xml = dependencies + lifecycle (compile/test/package). `mvn package` -> app.jar,
        // `java -jar app.jar` starts it. ClassNotFoundException / NoClassDefFoundError = the jar that
        // contains the class is not on the classpath (missing dependency or wrong scope).
        // Try: `mvn dependency:tree` to see exactly which jars you get. Full walkthrough: section 13.
    }
}
