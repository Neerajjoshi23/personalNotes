#include<bits/stdc++.h>
using namespace std;
int main(){
    vector<int>v;
    for(int i=0;i<10;i++){
        v.push_back(rand());
    }
    for(int i=0;i<10;i++){
        cout<<v[i]<<" ";
    }
    cout<<endl;
    int mini=*min_element(v.begin(),v.end());
    int maxi=*max_element(v.begin(),v.end());
    int sum=accumulate(v.begin(),v.end(),10);
    int freq=count(v.begin(),v.end(),v[0]);
    cout<<mini<<" "<<maxi<<" "<<sum<<" "<<freq<<endl;
    auto it=find(v.begin(),v.end(),rand());
    if(it==v.end()){
        cout<<" not found "<<endl;
    }
    else{
        cout<<"present at: "<<it-v.begin()<<endl;
    }
    reverse(v.begin(),v.end());
    for(auto i:v) cout<<i<<" ";
    cout<<endl;
    string s="abcdefghijklmnop";
    reverse(s.begin(),s.end());
    cout<<s<<endl;
    //O(n) every one

     //lamda function
    // [](int a){return a+3};
    auto sumF=[](int a,int b){return a+b;};
    cout<<sumF(2,3)<<endl;
    vector<int>v2={1,2,3,4,5,6,7,8,9,10};
    cout<<all_of(v2.begin(),v2.end(),[](int a){return a>0;})<<endl;;
    // all of return true if all statisfy the condition in given Range

    // if any one of them statisfy the consition in given range then it will return true
     cout<<any_of(v2.begin(),v2.end(),[](int a){return a<0;})<<endl;

     // if all them not statsify the given consition then only it return true
      
    cout<<none_of(v2.begin(),v2.end(),[](int a){
        return a<0;
    });
}