#include <bits/stdc++.h>
using namespace std;
const int M=1e9+7;
int bnr_ep(int a,int b){
   int res=1;
   while(b>0){
    if(b&1){
        res=(1LL*res*a)%M;
    }
    a=(1LL*a*a)%M;
    b>>=1;
   }
   return res;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
  ///MMI of A  is
   cout<<"enter the number"<<endl;
  int a;
  cin>>a;
 
  cout<<"MMI is "<<bnr_ep(a,M-2)<<endl;
    

    return 0;
}