#include <bits/stdc++.h>

using namespace std;
const long long int M=1e18+7;
long long binaryMultiply(long long a,long long b){
    long long res=0;
    while(b>0){
        if(b&1){
            res=(res+a)%M;
        }
        a=(a+a)%M;
        b>>=1;
    }
    return res;
}
long long binaryExponation(long long a,long long b){
    long long res=1;
    while(b>0){
        if(b&1){
            res=binaryMultiply(res,a)%M;
        }
        a=binaryMultiply(a,a)%M;
        b>>=1;
    }
    return res;
}

int main() {
    
    cout<<binaryExponation(3,9010)<<endl;

    return 0;
}