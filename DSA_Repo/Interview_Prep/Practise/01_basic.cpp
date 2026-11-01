#include <bits/stdc++.h>
using namespace std;
int main() {
    // normal input and output
    int a, b;
    cout << "Enter two integers: ";
    cin >> a >> b;
    cout << a + b << endl;
    // string input and output
    cout << "Enter a string: ";
    string s;
    cin >> s;
    cout << s << endl;
    // character input and output
    cout << "Enter a character: ";
    char c;
    cin >> c;
    cout << c << endl;
    // floating-point input and output
    cout << "Enter a floating-point number: ";
    float f;
    cin >> f;
    cout << f << endl;  
    // double input and output
    cout << "Enter a double: ";
    double d;
    cin >> d;
    cout << d << endl;
    // boolean input and output
    cout << "Enter a boolean value (0 or 1): ";
    bool bool_var;
    cin >> bool_var;
    cout << bool_var << endl;
    // long long input and output
    cout << "Enter a long long integer: ";
    long long ll;
    cin >> ll;
    cout << ll << endl;
    // short input and output
    cout << "Enter a short integer: ";
    short short_var;
    cin >> short_var;
    cout << short_var << endl;
    // string not stop at space or say full line 
    cout << "Enter a full line of text: ";
    string full_line;
    // cin.ignore() is used here to ignore the newline character left in the input buffer after the previous input.
    cin.ignore(); 
    getline(cin, full_line);
    cout << full_line << endl;
    //my question what getline and cin.ignore do?
    // Answer:
    // cin.ignore() is used to ignore the newline character left in the input buffer after using cin.
    // getline(cin, full_line) reads an entire line of input, including spaces, until a newline character is encountered.
    // Example usage:
    // Input:
    // Hello World
    // Output:
    // Hello World no then why need cin.ignore()?
    // Answer: Without cin.ignore(), the newline character left in the input buffer would be read by getline(), causing it to stop immediately and not read the intended full line.
    return 0;
}