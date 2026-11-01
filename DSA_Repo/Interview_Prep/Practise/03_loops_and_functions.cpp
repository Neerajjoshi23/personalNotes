// for ,while and do while break continue example i know just exmaple also add controle statement if else if else switch
// This file will contain examples of loops (for, while, do-while) and control statements (if, else if, else, switch) in C++
#include <bits/stdc++.h>
using namespace std;    
// Macro
#define PI 3.14159
#define E 2.71828

// Function prototypes mean defining function defination not body like what argu i will have and return type it will return
// Function prototypes provide the compiler with information about the functions before their actual definitions.
int sum(int a, int b);
int calculate(int a, int b,string operation);
void printMessage(string message);
// defining the functions declared in the prototypes aboveY
int sum(int a, int b){
    return a + b;
}
int calculate(int a, int b,string operation){
    // The calculate function takes two integers and a string representing the operation.
    // It performs the operation based on the value of the operation string using a switch statement.
    // Note: In C++, switch statements do not work directly with strings.
    // This code will not compile as is. You would need to use if-else statements for string comparison.
    if(operation == "add"){
        return a + b;
    }else if(operation == "subtract"){
        return a - b;
    }else if(operation == "multiply"){
        return a * b;
    }else if(operation == "divide"){
        return a / b;
    }
    else if(operation == "modulus"){
        return a % b;
    }else if(operation == "exponent"){
        return pow(a, b);
    }
    cout << "Invalid operation" << endl;
    return 0;
}
void printMessage(string message){
    cout << message << endl;
}
int main(){
    // for loop example
    for(int i = 0; i < 5; i++){
        cout << "For loop iteration: " << i << endl;
    }
    // how it works
    // The for loop initializes the variable i to 0, checks the condition i < 5 before each iteration,
    // and increments i by 1 after each iteration. The loop body executes as long as the condition is true.
    // while loop example
    int j = 0;
    while(j < 5){
        cout << "While loop iteration: " << j << endl;
        j++;
    }
    // how it works
    // The while loop checks the condition j < 5 before each iteration.
    // The loop body executes as long as the condition is true. The variable j is incremented inside the loop.
    // do-while loop example
    int k = 0;
    do{
        cout << "Do-while loop iteration: " << k << endl;
        k++;
    }while(k < 5);
    // how it works
    // The do-while loop executes the loop body first and then checks the condition k < 5.
    // The loop body executes at least once and continues as long as the condition is true.

    // control statement example
    int num = 2;
    if(num == 1){
        cout << "Number is 1" << endl;
    }else if(num == 2){
        cout << "Number is 2" << endl;
    }else{
        cout << "Number is neither 1 nor 2" << endl;
    }

    // switch statement example
    switch(num){
        case 1:
            cout << "Number is 1" << endl;
            break;
        case 2:
            cout << "Number is 2" << endl;
            break;
        default:
            cout << "Number is neither 1 nor 2" << endl;
            break;
    }
    char choice = 'y'; // Example of a character variable
    cout << "You chose: " << choice << endl;
    cin >> choice;
    switch(tolower(choice)){
        case 'y':
            cout << "You chose yes." << endl;
            break;
        case 'n':
            cout << "You chose no." << endl;
            break;
        default:
            cout << "Invalid choice." << endl;
            break;
    }
    printMessage("Switch statement executed.");
    printMessage("Calculation examples executed.");
    // to_String is used to convert the result of the calculate function to a string for concatenation with the message.
    int n=19212;
    cout << "Value of n: " << n << endl;
    cout << "String of n: " << to_string(n) << endl;
    printMessage("Result of calculate(5, 3, \"add\"):" + to_string(calculate(5, 3, "add")));
    printMessage("Result of calculate(5, 3, \"subtract\"):" + to_string(calculate(5, 3, "subtract")));
    printMessage("Result of calculate(5, 3, \"multiply\"):" + to_string(calculate(5, 3, "multiply")));
    printMessage("Result of calculate(5, 3, \"divide\"):" + to_string(calculate(5, 3, "divide")));
    printMessage("Result of calculate(5, 3, \"modulus\"):" + to_string(calculate(5, 3, "modulus")));
    printMessage("Result of calculate(5, 3, \"exponent\"):" + to_string(calculate(5, 3, "exponent")));
    printMessage("Result of calculate(5, 3, \"unknown\"):" + to_string(calculate(5, 3, "unknown")))     ;
    printMessage("End of program");
    printMessage("Program finished successfully.");
    printMessage("Goodbye!");
    return 0;
}