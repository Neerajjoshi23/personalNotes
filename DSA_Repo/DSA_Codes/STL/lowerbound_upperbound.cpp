#include<bits/stdc++.h>
using namespace std;
int main(){
    int n=6;
    int arr[6]={3,4,1,-9,-35,0};
    sort(arr,arr+n);
    for(int i=0;i<n;i++){
        cout<<arr[i]<<" ";
    }
    cout<<endl;
    int *ptr=lower_bound(arr,arr+n,1);
    int *ptr2=upper_bound(arr,arr+4,0);
    if(ptr==arr+n){
        cout<<"Not Found"<<endl;
    }
    else{

        cout<<"present at "<<ptr-arr<<endl;
    }
      if(ptr2==arr+4){
        cout<<"Not Found"<<endl;
    }
    else{
        cout<<"present at "<<ptr2-arr<<endl;
    }
    // maps ma 
    map<int,int>mp;
    mp[0]=2;
    mp[-3]=9;
    mp[4]=5;
    mp[-56]=100;
    mp[-43]=-343;
    auto it=mp.lower_bound(-56);
    if(it==mp.end()){
        cout<<"Not Found"<<endl;
    }
    else{
        cout<<(it)->first<<" "<<it->second<<endl;
    }
    
    
    }