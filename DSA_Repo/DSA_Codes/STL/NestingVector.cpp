#include<bits/stdc++.h>
using namespace std;
void printVec(vector<pair<int,int>> v){
    cout<<"size"<<v.size()<<endl;
    for(int i = 0; i<v.size(); ++i){
        cout<<v[i].first <<" "<<v[i].second <<endl;  //v[i] yaha pe ek pair hai
    }
    cout<<endl;
}

int main(){
   vector<pair<int,int>>v = {{1,2}, {2,3}, {4,5}}; //hrr ek vector ka element pair hone wala.
   printVec(v);

   int n;
   cin>>n;
    vector<pair<int,int>>v2;
   for(int i = 0; i<n; i++){
    int x,y;
    cin>> x>>y;
    v2.push_back(make_pair(x,y));
   }
   printVec(v2);
}