// what is memory in C++?
// Memory in C++ refers to the storage space that is used to hold data and instructions while a program is running. It can be categorized into different types such as stack memory, heap memory, static memory, and code memory.
// Stack memory is used for local variables and function call management, and it is automatically managed by the compiler.
// Heap memory is used for dynamic memory allocation, and it must be manually managed by the programmer using new and delete.
// Static memory is used for global and static variables, and it is allocated at compile time and persists throughout the program's execution.
// Code memory (or text segment) is used to store the compiled program code.
// Understanding memory management is crucial for writing efficient and bug-free C++ programs. Proper use of stack and heap memory can help optimize performance and prevent memory leaks.

// Example:
#include <iostream>
using namespace std;    
int main(){
    // Stack memory example
    int stackVar = 10;
    cout << "Stack variable: " << stackVar << endl;

    // Heap memory example
    int* heapVar = new int(20);
    cout << "Heap variable: " << *heapVar << endl;
    delete heapVar; // Freeing heap memory
    heapVar = nullptr; // Avoid dangling pointer
    return 0;
}