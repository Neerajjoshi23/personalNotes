#include<bits/stdc++.h>
using namespace std;
bool cmp(int a,int b){
    return a>b;
}
int main(){
    int n=6;
    int arr[6]={3,4,1,-9,-35,0};
    sort(arr,arr+n);
    for(int i=0;i<n;i++){
        cout<<arr[i]<<" ";
    }
    cout<<endl;
    vector<int>v={3,4,1,-9,-35,0};
    sort(v.begin(),v.end());
    //starting position first section ma
    // net to last location to where you want to sort
    for(auto &i:v) cout<<i<<" ";
    cout<<endl;
    // introsort // O(nlog(n))
    //Comparator function 
    sort(v.begin(),v.end(),cmp);
    for(auto i:v) cout<<i<<" ";
    cout<<endl;


}