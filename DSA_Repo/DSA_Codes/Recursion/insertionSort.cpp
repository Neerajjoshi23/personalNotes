#include<iostream>
using namespace std;
void insertionSort(int *arr,int ind,int n){
    //basecase
    if(ind==n || n==0 ) return ;
    int j=ind-1;
    int val=arr[ind];
    while(j>=0){
        if(arr[j]>val){
            arr[j+1]=arr[j];
            j--;
        }
        else break;
    }
    arr[j+1]=val;
 
    return insertionSort(arr,ind+1,n);

}
int main(){
    int arr[]={8,2,3,42,1,3,1,3,2,1,3,4,3,2,-234};
    int n=15;
    insertionSort(arr,1,n);
    for(int i=0;i<n;i++) cout<<arr[i]<<" ";
    cout<<endl;
}