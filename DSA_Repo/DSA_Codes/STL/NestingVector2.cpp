//array of vector and vector of vector
#include<bits/stdc++.h>
using namespace std;
void printVec(vector<int> &v){
    cout<<"size" << v.size() <<endl;
    for(int i=0; i<v.size(); ++i){
        cout<<v[i]<<" ";
    }
    cout<<endl;
}

int main(){
    int N;
    cin>>N; //how many vectors we want to make.
    vector<int>v[N];  
    // vector<int> v[10]; //10 vector bn chuka jiska size 0 hai
    //ek ek vector ko input lena hai
    for(int i=0; i<N; ++i){
        int n;
        cin>>n; //size of vector. 
        for(int j=0; j<n; ++j){
            int x;
            cin>>x;
            v[i].push_back(x);

        }
    }
    for(int i=0; i<N; ++i){
      printVec(v[i]);
    }
}
// no of rows will be fixed but no of column will not.