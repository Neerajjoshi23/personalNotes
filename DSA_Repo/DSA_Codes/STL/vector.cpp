#include<bits/stdc++.h>
using namespace std;
void printVec(vector<int>v){
    cout<< "size: " <<v.size()<< endl;
    for( int i=0; i<v.size(); ++i){
        cout<< v[i] << " ";
    }
    cout<<endl;
}
int main(){
    // int a[10];
    // vector<int>v; size=0
    vector<int>v;
    int n;
    cin>>n; //no of vector we want to enter from user. //no of element in the vector.
    for(int i=0; i<n; i++){
        int x;
        cin>>x;
        v.push_back(x);
    }
    printVec(v);
    v.pop_back();
    printVec(v);

  vector<int> v1(5,4); // 5 size ka vactor bna sbme 4 store hai
    v1.push_back(7);
    printVec(v1);

     vector<int> v2; // 5 size ka vactor bna sbme 4 store hai
    v2.push_back(7);
     v2.push_back(6);
     //vector v2 v ka copy bna
     vector<int>v3 = v2;  //o(n) one by one copy kr rha.
     v3.push_back(5);
    printVec(v2);
    printVec(v3); //same copy bn rha so koi effect nhi hua.
    printVec(v2);
}
//  The capacity of a vector is the total number of elements it can hold. 