#include<bits/stdc++.h>
using namespace std;
int main()
{
   
//pair me kaise use kre
    vector<pair<int,int>> v_p = {{1,2}, {2,3}};
    for(pair<int,int> &value : v_p){
        cout<< value.first <<" " <<value.second <<endl;
    }

    //range based loop isme value copy ho rhi actual value use krne ke liye refrence ka use krenge
    //index use nhi krna prega access krne ke liye directly access kr skte/ value directly vector me aajayegi
     
      
     for(auto &value: v_p){
         cout<<value.first<< " "<<value.second<<endl;; //no change in value due to  value ++ since it is copy 
     }
    cout<<endl;


        // vector<int> :: iterator it = v.begin(); we can remove this statement and (auto it) will automatically assume data type of vector.
    //ye apne aap dekh lega vector.int ka iterator hai

}