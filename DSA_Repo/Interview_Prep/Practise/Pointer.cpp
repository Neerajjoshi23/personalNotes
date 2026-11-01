#include <iostream>
using namespace std;
int printWithPtr(int *arr, int size) {
    cout << "Printing array using pointer:" << endl;
    for (int i = 0; i < size; i++) {
        cout << "Memory Address of Element " << i << ": " << (arr + i) << endl;
        cout << "Value at Element " << i << ": " << *(arr + i) << endl;
    }
    return 0;
}
int printWithOutPtr(int arr[], int size) {
    cout << "Printing array without using pointer:" << endl;
    for (int i = 0; i < size; i++) {
        cout << "Memory Address of Element " << i << ": " << &arr[i] << endl;
        cout << "Value at Element " << i << ": " << arr[i] << endl;
    }
    return 0;
}
int modifyPointer(int **p){
    *p = nullptr; // modify the pointer to point to nullptr
    return 0;
}
int main() {
// what is pointer  
// A pointer is a variable that stores the memory address of another variable.
int a = 1;
int *p = &a; // &a => address of a in memory and p is storing that address simple
// prints the memory address stored in the pointer
cout<<"Memory Address in Pointer: " << p << endl; // prints the memory address stored in the pointer
cout<<"Value at Pointer: " << *p << endl; // prints the value stored at the address p is pointing to
cout<<"Size of Pointer: " << sizeof(p) << endl; // prints the size of the pointer itself
cout<<"Size of Value at Pointer: " << sizeof(*p) << endl; // prints the size of the value stored at the address p is pointing to
// *p => value stored at the address p is pointing to
// size of p
// sizeof(p) will give the size of the pointer itself, not the size of the variable it points to.
// Example:
// printf("%zu\n", sizeof(p)); // typically 8 bytes on a 64-bit system
// printf("%zu\n", sizeof(*p)); // size of the variable p points to, in this case, sizeof(int)
char c = 'l';
char *ch = &c; // ch is a pointer to a character 'l'
// sizeof(ch) will give the size of the pointer itself
// sizeof(*ch) will give the size of the character it points to, typically 1 byte
cout << sizeof(ch) << endl; // size of the pointer itself
cout << sizeof(*ch) << endl; // size of the value stored at the address ch is pointing to
// explain array and pointer i know arr is address of the first element of the array or &arr[0] in memory
int arr[3] = {1, 2, 3};
int *ptr = arr; // ptr points to the first element of the array
cout << "Memory Address of First Element: " << ptr << endl;
cout << "Value at First Element: " << *ptr << endl;
cout << "Memory Address of Second Element: " << (ptr + 1) << endl;
cout << "Value at Second Element: " << *(ptr + 1) << endl;
cout << "Memory Address of Third Element: " << (ptr + 2) << endl;
cout << "Value at Third Element: " << *(ptr + 2) << endl;
// basically under the hood arr[i]= *(arr + i)
// and &arr[i] = (arr + i) simple rule remember is iam correct?
// Yes, you are correct. This is a fundamental concept in C/C++ pointer arithmetic.
 // exmaple passing in func
 printWithPtr(arr,3);
 printWithOutPtr(arr,3);
 // is there a diff in arr and &arr
 // Yes, there is a difference:
 // arr is the address of the first element of the array (type: int* for int arr[]).
 // &arr is the address of the entire array (type: int (*)[3] for int arr[3]).
 // Although they may have the same numerical value, their types are different, which affects pointer arithmetic.
 // what is null pointer,wild pointer,dangling pointer
 // Null pointer: A pointer that is initialized to nullptr (or NULL in C) and does not point to any valid memory location.
 // Wild pointer: A pointer that has not been initialized and may point to any random memory location.
 // Dangling pointer: A pointer that points to a memory location that has been deallocated or freed.
 // Example usage:
 int *nullPtr = nullptr; // Null pointer
 int *wildPtr;           // Wild pointer (uninitialized)
 int *danglingPtr = new int(5);
 delete danglingPtr;     // Now danglingPtr is a dangling pointer
 danglingPtr = nullptr; // Good practice to set it to nullptr after deletion
// pointer arithmetic
// what is p++ *(p)++
// p++ increments the pointer itself, moving it to the next memory location of the type it points to.
// *(p)++ increments the value at the memory location the pointer is pointing to, not the pointer itself.
// what is ptr2-ptr1
// ptr2 - ptr1 gives the number of elements of the type the pointers point to between ptr1 and ptr2. It essentially tells you the distance between the two pointers in terms of array elements.
// what if ptr2<ptr1
// If ptr2 is less than ptr1, the result of ptr2 - ptr1 will be a negative number, indicating that ptr2 is that many elements before ptr1 in the array.
// Note: Pointer subtraction is only valid for pointers pointing to elements of the same array. Subtracting pointers from different arrays leads to undefined behavior.

// double pointer
// A double pointer is a pointer that stores the address of another pointer.
// Syntax: int **ptr;
// Example:
// int a = 10;
// int *p = &a;
// int **dp = &p;
// Accessing value: **dp gives the value of a.
// example of double pointer usage:
int a1 = 10;
int *p1 = &a1;
int **dp = &p1;
std::cout << "Value of a1 before modification through double pointer: " << a1 << std::endl;
**dp = 20; // modifies the value of a1 through the double pointer
std::cout << "Value of a1 after modification through double pointer: " << a1 << std::endl;

// Double pointers are useful when you need to modify the pointer itself within a function, or when dealing with dynamic arrays of pointers.
modifyPointer(&p1); // example usage of the modifyPointer function
std::cout << "Value of p1 after modification through modifyPointer function: " << p1 << std::endl;
// After calling modifyPointer, p1 should be nullptr. // why zero? Because modifyPointer sets the pointer to nullptr, effectively "zeroing" it out. mean it is correct.
// why returning pointer or address in function is dangerous
// Returning a pointer or address from a function can be dangerous if the pointer points to a local variable within the function. Once the function returns, the local variable goes out of scope, and the pointer becomes a dangling pointer, leading to undefined behavior if dereferenced.
// Safe alternatives include returning by value, using dynamic memory allocation (with proper deletion), or returning a reference to a static or global variable.
// EXAMPLE:
// Dangerous: returning address of local variable
// int* dangerousFunction() {
//     int localVar = 10;
//     return &localVar; // localVar goes out of scope after function returns
// }
// Safe: using dynamic memory allocation
// int* safeFunction() {
//     int* ptr = new int(10);
//     return ptr; // caller is responsible for deleting the allocated memory
// }
 // Thinks to remember =>
 // Pointer basics:
 // 1. A pointer is a variable that stores the memory address of another variable.
 // 2. The * operator is used to access the value at the address the pointer is pointing to.
 // 3. The & operator is used to get the memory address of a variable.
 // 4. Pointer arithmetic allows you to navigate through arrays using pointers.
 // 5. Always ensure a pointer is initialized before dereferencing it to avoid undefined behavior.
 // 6. Arrays and pointers are closely related; the name of an array acts as a pointer to its first element.
 // 7. When passing arrays to functions, you are actually passing a pointer to the first element of the array.
 // 8. Modifying the array through the pointer will affect the original array since both point to the same memory location.
 // 9. Always be cautious with pointer arithmetic to avoid accessing memory out of bounds, which can lead to undefined behavior.
 // Pointer arithmetic summary:
 // - Incrementing a pointer (p++) moves it to the next element of its type.
 // - Decrementing a pointer (p--) moves it to the previous element of its type.
 // - Adding an integer to a pointer (p + n) moves it n elements forward.
 // - Subtracting an integer from a pointer (p - n) moves it n elements backward.
 // - Subtracting two pointers (ptr2 - ptr1) gives the number of elements between them.
 // - Always ensure pointers are pointing to valid memory before performing arithmetic to avoid undefined behavior.
 //11. Always set dangling pointers to nullptr after deletion to avoid accidental dereferencing.


return 0;
}