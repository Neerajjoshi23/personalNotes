#include<bits/stdc++.h>
using namespace std;
void segregate(int *arr,int n){
        bool negative=1;
        for(int i=0;i<n;i++){
        
        if(negative && arr[i]<0){
            negative=0;
        }
        else if(!negative && arr[i]>=0){
            negative=1;
        }
        else{
            int ind=-1;
            for(int j=i+1;j<n;j++){
                if(negative && arr[j]<0){
                    negative=0;
                    ind=j;
                  break;

                }
                else if(!negative && arr[j]>=0){
                    negative=1;
                    ind=j;
                    break;
                }
            }
            if(ind==-1) break;
            int temp=arr[ind];
            for(int j=ind-1;j>=i;j--){
              arr[j+1]=arr[j];
            }
            arr[i]=temp;

        }
        
        
        }
}
int main(){
   int arr[] = {-5, -2, 5, 2, 4, 7, 1, 8, 0, -8};
    int n=10;
    segregate(arr,n);
    for(int i=0;i<n;i++){
        cout<<arr[i]<<" ";
    }
    cout<<endl;
}