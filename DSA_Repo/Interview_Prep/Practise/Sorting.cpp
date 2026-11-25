#include<bits/stdc++.h>
using namespace std;
vector<int> bubble_sort(vector<int> arr,int n){
    // TC -> O(n^2) SC -> O(1)
    // Optimized Bubble Sort
    for(int i=n-1;i>=0;i--){
        bool swapped=false;
        for(int j=0;j<i;j++){
            if(arr[j]>arr[j+1]){
                swap(arr[j],arr[j+1]);
                swapped=true;
            }
        }
        if(!swapped){
            break;
        }
    }
    return arr;
}

vector<int> selection_sort(vector<int> arr,int n){
    // TC -> O(n^2) SC -> O(1)
    // Selection Sort
    for(int i=0;i<n-1;i++){
        int min_index=i;
        for(int j=i+1;j<n;j++){
            if(arr[j]<arr[min_index]){
                min_index=j;
            }
        }
        swap(arr[i],arr[min_index]);
    }
    return arr;
}
vector<int> insertion_sort(vector<int> arr,int n){
    // TC -> O(n^2) SC -> O(1)
    // Insertion Sort
    for(int i=1;i<n;i++){
        int key=arr[i];
        int j=i-1;
        while(j>=0 && arr[j]>key){
            arr[j+1]=arr[j];
            j--;
        }
        arr[j+1]=key;
    }
    return arr;
}
void print(vector<int> arr){
    for(int i=0;i<arr.size();i++){
        cout<<arr[i]<<" ";
    }
    cout<<endl;
}
int main(){
    int n;
    cin>>n;
    vector<int> arr(n);
    for(int i=0;i<n;i++){
        cin>>arr[i];
    }
// • Selection Sort: Find the largest element in [0, i] and swap it directly into position i.
// • Bubble Sort: Carry the largest element of [0, i] step-by-step via adjacent swaps until it lands at position i.
// • Insertion Sort: Assume [0, i-1] is sorted, and slide arr[i] backward into its exact spot.

    vector<int> arr1=selection_sort(arr,n);
    vector<int> arr2=bubble_sort(arr,n);
    vector<int> arr3=insertion_sort(arr,n);
    cout<<"Selection Sort: ";
    print(arr1);
    cout<<"Bubble Sort: ";
    print(arr2);
    cout<<"Insertion Sort: ";
    print(arr3);
    return 0;
}