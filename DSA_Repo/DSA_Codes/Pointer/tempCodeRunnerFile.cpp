
 #include<iostream>
using namespace std;
   
int partition( int arr[], int s, int e) {

    int pivot = arr[s];
    int pivotIndex=s;
    int j=s+1;
    while(j<=e){
        if(arr[j]<=pivot){
            swap(arr[pivotIndex],arr[pivotIndex+1]);
            swap(arr[pivotIndex++],arr[j]);
        }
        j++;
    }
    return pivotIndex;

}
int main(){
    int arr[]={5,7,8,3,0,1,3,4,6};
    partition(arr,0,9);
    for(int i=0;i<9;i++) cout<<arr[i]<<" ";
    cout<<endl;
}
    