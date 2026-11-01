#include <bits/stdc++.h>
using namespace std;
int main() {
    // Example of arithmetic operators
    cout << "Arithmetic Operators Example:" << endl;
    int a = 10, b = 5;
    cout << "a + b = " << a + b << endl;
    cout << "a - b = " << a - b << endl;
    cout << "a * b = " << a * b << endl;
    cout << "a / b = " << a / b << endl;
    cout << "a % b = " << a % b << endl;

    //Logical operators example
    cout << "Logical Operators Example:" << endl;
    bool x = true, y = false;
    cout << "x && y = " << (x && y) << endl;
    cout << "x || y = " << (x || y) << endl;
    cout << "!x = " << (!x) << endl;

    // Bitwise opertor example & , | , ^ , ~
    cout << "Bitwise Operators Example:" << endl;
    int p = 6, q = 3; // 6 = 110, 3 = 011 in binary
    cout << "p & q = " << (p & q) << endl; // 110 & 011 = 010 = 2
    cout << "p | q = " << (p | q) << endl; // 110 | 011 = 111 = 7
    cout << "p ^ q = " << (p ^ q) << endl; // 110 ^ 011 = 101 = 5
    cout << "~p = " << (~p) << endl;       // ~110 = ...111001 = -7

    // Tricks
    cout << "Tricks Example:" << endl;
    int r = 5;
    cout << "r << 1 = " << (r << 1) << endl; // Left shift: 5 * 2 = 10
    cout << "r >> 1 = " << (r >> 1) << endl; // Right shift: 5 / 2 = 2

    // checking odd and even
    cout << "Odd and Even Check Example:" << endl;
    int s = 7;
    cout << "s is " << (s % 2 == 0 ? "even" : "odd") << endl;
    cout << "s is " << (s & 1 ? "odd" : "even") << " (using bitwise check)" << endl;

    //checking last bit or ith bit
    cout << "Last bit of s is " << (s & 1) << endl;
    int i = 2; // checking 2nd bit (0-indexed from right)
    cout << "The " << i << "th bit of s is " << ((s >> i) & 1) << endl;

    // 2 raise to the power of n using bitwise shift
    int n = 3;
    cout << "2^" << n << " = " << (1 << n) << endl; // 2^3 = 8

    // set unset flip its bit of a number
    int t = 5; // 0101 in binary
    int bit_position = 1; // 0-indexed from right
    // Set the bit
    t |= (1 << bit_position);
    cout << "After setting bit " << bit_position << ": " << t << endl;
    // Unset the bit
    t &= ~(1 << bit_position);
    cout << "After unsetting bit " << bit_position << ": " << t << endl;
    // Flip the bit
    t ^= (1 << bit_position);
    cout << "After flipping bit " << bit_position << ": " << t << endl;

    // XOR example
    int u = 5, v = 3; // 5 = 0101, 3 = 0011 in binary
    cout << "u ^ v = " << (u ^ v) << endl; // 0101 ^ 0011 = 0110 = 6

    // Swapping two numbers using XOR
    cout << "Before swapping: u = " << u << ", v = " << v << endl;
    u ^= v;
    v ^= u;
    u ^= v;
    cout << "After swapping: u = " << u << ", v = " << v << endl;
    // End of XOR swapping example
    // xor of same number results in 0
    int w = 4;
    cout << "w ^ w = " << (w ^ w) << endl; // 4 ^ 4 = 0

    return 0;

}