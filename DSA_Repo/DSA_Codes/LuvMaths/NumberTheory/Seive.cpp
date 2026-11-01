#include <bits/stdc++.h>
using namespace std;
const int N=1e7+10;
vector<bool>isPrime(N,1);
vector<int>spf(N,0);
vector<int>hpf(N,0);
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    isPrime[0]=isPrime[1]=0;
    for(int i=2;i<N;i++){
        if(isPrime[i]==0) continue;
        spf[i]=i;
        hpf[i]=i;
        for(int j=2*i;j<=N;j+=i){
            if(spf[j]==0) spf[j]=i;
            hpf[j]=i;
            isPrime[j]=0;
        }
    }
    int n;
    cout<<"ENTER THE NUMBER"<<endl;
    cin>>n;
    if(isPrime[n]) cout<<"Prime hai"<<endl;
    else cout<<"Not a Prime"<<endl;
    for(int i=2;i<=n;i++) cout<<spf[i]<<" ";
    cout<<endl;
   vector<int>ans;
   while(n>1){
    int prime=spf[n];
    while(n%prime==0) {n/=prime; ans.push_back(prime);}
   }
   for(auto i:ans) cout<<i<<" ";
   cout<<endl;


    return 0;
}