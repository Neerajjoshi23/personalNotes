#include<iostream> 
using namespace std;

#define PI 3.14
#define area(r)(PI*r*r) // function like macro

int main() {

    int r = 5;
    //double pi = 3.14;

    double area = PI * r * r;

    cout << "Area is " << area << endl;
    cout<<area(r)<<endl;

    return 0;
}
//https://www.geeksforgeeks.org/macros-and-its-types-in-c-cpp/