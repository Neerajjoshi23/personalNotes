#include <bits/stdc++.h>
using namespace std;

void checkPrime(int n){
    if(n==1) cout<<"Not Prime";
    else{
        bool isPrime=1;
    // for(int i=2;i<n;i++){
    //     if(n%i==0) isPrime=0;
    // }

    for(int i=2;i*i<=n;i++){
        if(n%i==0) isPrime=0;
    }
    if(isPrime==0) cout<<"Not Prime"<<endl;
    else cout<<"Prime  "<<endl;
    }
}
void findPrimeFcator(int n){
    if(n==1) cout<<"1"<<endl;
    else{
        vector<int>ans;
        for(int i=2;i*i<=n;i++){
            if(n%i==0){
                while(n%i==0){
                    ans.push_back(i);
                    n/=i;
                }
            }
        }
        if(n>1) ans.push_back(n); 
        for(auto i:ans) cout<<i<<" ";
        cout<<endl;
    } 
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cout<<"Enter the number here"<<endl;
    cin>>n;
    checkPrime(n);
    findPrimeFcator(n);

    return 0;
}