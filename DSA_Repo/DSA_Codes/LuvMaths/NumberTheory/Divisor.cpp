#include <bits/stdc++.h>
using namespace std;

void Count(int n){
    int cnt=0;
    int sum=0;
    for(int i=1;i<=n;i++){
        if(n%i==0){
            cnt++;
            sum+=i;
        }
    }
    cout<<"count is "<<cnt<<" Sum is"<<sum<<endl;
    //method 2
    cnt=0;
    sum=0;
    for(int i=1;i*i<=n;i++){
        if(n%i==0){
            cnt++;
            sum+=i;
            if(i!=n/i) {sum+=n/i; cnt++;}
        }
    }
    cout<<"count is "<<cnt<<" Sum is"<<sum<<endl;
    

}
int main() {
  
    int n;
    cin>>n;
    Count(n);




    return 0;
}