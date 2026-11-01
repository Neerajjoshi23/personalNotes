#include <bits/stdc++.h>
using namespace std;
const int N=1e5+10;

vector<vector<int>>divisor(N);
vector<int>sum(N,0);

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    for(int i=2;i<N;i++){
        for(int j=i;j<N;j+=i){
            divisor[j].push_back(i);
            sum[j]+=i;
        }
    }
    for(int i=2;i<30;i++){
        for(int j=0;j<divisor[i].size();j++) cout<<divisor[i][j]<<" ";
        cout<<endl;
    }
    

    return 0;
}